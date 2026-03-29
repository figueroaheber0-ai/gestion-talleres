import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionUser } from '../auth/auth.types';

export interface VehicleProfileRow {
  vehicleId: string;
  alias: string | null;
  color: string | null;
  notes: string | null;
  insuranceProvider: string | null;
  policyNumber: string | null;
}

@Injectable()
export class WorkshopService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(user: SessionUser) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    const [appointmentsToday, activeOrders, vehiclesInWorkshop, recentAppointments] =
      await Promise.all([
        this.prisma.appointment.count({
          where: {
            tenantId: user.tenantId,
          },
        }),
        this.prisma.workOrder.count({
          where: {
            tenantId: user.tenantId,
            status: {
              in: ['pending', 'estimating', 'waiting_parts', 'repairing'],
            },
          },
        }),
        this.prisma.workOrder.count({
          where: {
            tenantId: user.tenantId,
            status: {
              in: ['pending', 'estimating', 'waiting_parts', 'repairing'],
            },
          },
        }),
        this.prisma.appointment.findMany({
          where: { tenantId: user.tenantId },
          include: {
            vehicle: true,
          },
          orderBy: [{ date: 'asc' }, { time: 'asc' }],
          take: 5,
        }),
      ]);

    return {
      stats: {
        appointmentsToday,
        activeOrders,
        vehiclesInWorkshop,
      },
      recentAppointments: recentAppointments.map((appointment) => ({
        id: appointment.id,
        vehicleLabel: `${appointment.vehicle.brand} ${appointment.vehicle.model}`,
        plate: appointment.vehicle.plate,
        time: appointment.time,
        reason: appointment.reason,
        status: appointment.status,
      })),
    };
  }

  async listClients(user: SessionUser, search?: string) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    return this.prisma.client.findMany({
      where: {
        tenantId: user.tenantId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                {
                  vehicles: {
                    some: {
                      plate: {
                        contains: search.replace(/\s+/g, ''),
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        vehicles: {
          include: {
            workOrders: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIntake(
    user: SessionUser,
    input: {
      clientName: string;
      phone?: string;
      email?: string;
      plate: string;
      brand: string;
      model: string;
      year?: number;
      reason: string;
      date: string;
      time: string;
    },
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    const normalizedPlate = input.plate.replace(/\s+/g, '').toUpperCase();

    let client = null;
    if (input.email) {
      client = await this.prisma.client.findFirst({
        where: {
          tenantId: user.tenantId,
          email: input.email.toLowerCase().trim(),
        },
      });
    }

    if (!client) {
      client = await this.prisma.client.create({
        data: {
          tenantId: user.tenantId,
          name: input.clientName,
          phone: input.phone,
          email: input.email?.toLowerCase().trim(),
        },
      });
    }

    const vehicle = await this.prisma.vehicle.upsert({
      where: {
        tenantId_plate: {
          tenantId: user.tenantId,
          plate: normalizedPlate,
        },
      },
      update: {
        clientId: client.id,
        brand: input.brand,
        model: input.model,
        year: input.year,
      },
      create: {
        tenantId: user.tenantId,
        clientId: client.id,
        plate: normalizedPlate,
        brand: input.brand,
        model: input.model,
        year: input.year,
      },
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId: user.tenantId,
        vehicleId: vehicle.id,
        date: new Date(input.date),
        time: input.time,
        reason: input.reason,
        status: 'pending',
      },
    });

    return { appointmentId: appointment.id, vehicleId: vehicle.id, clientId: client.id };
  }

  async getVehicleHistory(user: SessionUser, vehicleId: string) {
    const where =
      user.audience === 'client'
        ? await this.buildClientVehicleWhere(vehicleId, user.clientId ?? null)
        : { id: vehicleId, tenantId: user.tenantId };

    const vehicle = await this.prisma.vehicle.findFirst({
      where,
      include: {
        tenant: true,
        client: true,
        workOrders: {
          include: {
            mechanic: true,
            appointment: true,
            parts: {
              include: { item: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehiculo no encontrado.');
    }

    const workOrderIds = vehicle.workOrders.map((order) => order.id);
    const updates = workOrderIds.length
      ? await this.prisma.$queryRawUnsafe<
          Array<{
            id: string;
            workOrderId: string;
            title: string;
            message: string;
            visibility: string;
            createdAt: Date;
          }>
        >(
          `SELECT id, "workOrderId" as "workOrderId", title, message, visibility, "createdAt" as "createdAt"
           FROM "ClientUpdate"
           WHERE "workOrderId" IN (${this.joinSqlValues(workOrderIds)})
           ORDER BY "createdAt" DESC`,
        )
      : [];

    return {
      id: vehicle.id,
      tenantId: vehicle.tenantId,
      workshopName: vehicle.tenant.name,
      workshops: [vehicle.tenant.name],
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      client: {
        id: vehicle.client.id,
        name: vehicle.client.name,
        phone: vehicle.client.phone,
        email: vehicle.client.email,
      },
      profile: await this.getVehicleProfile(vehicle.id),
      workOrders: vehicle.workOrders.map((order) => ({
        ...order,
        tenantId: vehicle.tenantId,
        workshopName: vehicle.tenant.name,
        updates: updates.filter((update) => update.workOrderId === order.id),
      })),
    };
  }

  async getClientPortal(user: SessionUser) {
    if (user.audience !== 'client' || !user.clientId) {
      throw new ForbiddenException('No autorizado.');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: user.clientId },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const relatedClients = await this.resolveRelatedPortalClients(client.id);
    const allVehicles = relatedClients.flatMap((relatedClient) =>
      relatedClient.vehicles.map((vehicle) => ({
        ...vehicle,
        owner: {
          id: relatedClient.id,
          name: relatedClient.name,
          phone: relatedClient.phone,
          email: relatedClient.email,
        },
      })),
    );
    const workOrderIds = allVehicles.flatMap((vehicle) =>
      vehicle.workOrders.map((order) => order.id),
    );

    const updates = workOrderIds.length
      ? await this.prisma.$queryRawUnsafe<
          Array<{
            id: string;
            workOrderId: string;
            title: string;
            message: string;
            visibility: string;
            createdAt: Date;
          }>
        >(
          `SELECT id, "workOrderId" as "workOrderId", title, message, visibility, "createdAt" as "createdAt"
           FROM "ClientUpdate"
           WHERE "workOrderId" IN (${this.joinSqlValues(workOrderIds)})
           ORDER BY "createdAt" DESC`,
        )
      : [];
    const profiles = await this.getVehicleProfiles(allVehicles.map((vehicle) => vehicle.id));

    return {
      ...client,
      vehicles: this.groupPortalVehicles(allVehicles, updates, profiles),
    };
  }

  async addVehicleToClientPortal(
    user: SessionUser,
    input: {
      plate: string;
      brand: string;
      model: string;
      year?: number;
    },
  ) {
    if (user.audience !== 'client' || !user.clientId) {
      throw new ForbiddenException('No autorizado.');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: user.clientId },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const normalizedPlate = input.plate.replace(/\s+/g, '').toUpperCase();
    const existingVehicle = await this.prisma.vehicle.findUnique({
      where: {
        tenantId_plate: {
          tenantId: client.tenantId,
          plate: normalizedPlate,
        },
      },
    });

    if (existingVehicle && existingVehicle.clientId !== client.id) {
      throw new BadRequestException(
        'Esa patente ya existe en este taller con otro titular. Contacta al taller para validarla.',
      );
    }

    const vehicle = await this.prisma.vehicle.upsert({
      where: {
        tenantId_plate: {
          tenantId: client.tenantId,
          plate: normalizedPlate,
        },
      },
      update: {
        clientId: client.id,
        brand: input.brand,
        model: input.model,
        year: input.year,
      },
      create: {
        tenantId: client.tenantId,
        clientId: client.id,
        plate: normalizedPlate,
        brand: input.brand,
        model: input.model,
        year: input.year,
      },
    });

    return { ok: true, vehicleId: vehicle.id };
  }

  async updateClientPortalVehicleProfile(
    user: SessionUser,
    vehicleId: string,
    input: {
      alias?: string | null;
      color?: string | null;
      notes?: string | null;
      insuranceProvider?: string | null;
      policyNumber?: string | null;
    },
  ) {
    if (user.audience !== 'client' || !user.clientId) {
      throw new ForbiddenException('No autorizado.');
    }

    const where = await this.buildClientVehicleWhere(vehicleId, user.clientId);
    const vehicle = await this.prisma.vehicle.findFirst({
      where,
      select: { id: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado.');
    }

    await this.ensureVehicleProfileTable();
    await this.prisma.$executeRaw`
      INSERT INTO "VehicleProfile" (
        "vehicleId",
        alias,
        color,
        notes,
        "insuranceProvider",
        "policyNumber",
        "updatedAt"
      )
      VALUES (
        ${vehicle.id},
        ${this.normalizeOptionalText(input.alias)},
        ${this.normalizeOptionalText(input.color)},
        ${this.normalizeOptionalText(input.notes)},
        ${this.normalizeOptionalText(input.insuranceProvider)},
        ${this.normalizeOptionalText(input.policyNumber)},
        NOW()
      )
      ON CONFLICT ("vehicleId")
      DO UPDATE SET
        alias = ${this.normalizeOptionalText(input.alias)},
        color = ${this.normalizeOptionalText(input.color)},
        notes = ${this.normalizeOptionalText(input.notes)},
        "insuranceProvider" = ${this.normalizeOptionalText(input.insuranceProvider)},
        "policyNumber" = ${this.normalizeOptionalText(input.policyNumber)},
        "updatedAt" = NOW()
    `;

    return { ok: true, vehicleId: vehicle.id };
  }

  async getAppointmentsBoard(user: SessionUser) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    const [appointments, workOrders] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { tenantId: user.tenantId },
        include: {
          workOrder: true,
          vehicle: {
            include: {
              client: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
      }),
      this.prisma.workOrder.findMany({
        where: {
          tenantId: user.tenantId,
          status: {
            in: ['pending', 'estimating', 'waiting_parts', 'repairing', 'finished'],
          },
        },
        include: {
          vehicle: {
            include: {
              client: true,
            },
          },
          appointment: true,
          mechanic: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const itemsByColumn = {
      agendados: appointments
        .filter((appointment) => !appointment.workOrder)
        .map((appointment) => ({
          id: appointment.id,
          itemType: 'appointment',
          vehicleId: appointment.vehicleId,
          plate: appointment.vehicle.plate,
          model: `${appointment.vehicle.brand} ${appointment.vehicle.model}`,
          client: appointment.vehicle.client.name,
          reason: appointment.reason,
          assigned: 'Sin asignar',
          urgent: /freno|motor|electr|ruido|urgente/i.test(appointment.reason),
          scheduledFor: appointment.date,
          time: appointment.time,
        })),
      diagnostico: workOrders
        .filter((order) => ['pending', 'estimating'].includes(order.status))
        .map((order) => ({
          id: order.id,
          itemType: 'workOrder',
          vehicleId: order.vehicleId,
          plate: order.vehicle.plate,
          model: `${order.vehicle.brand} ${order.vehicle.model}`,
          client: order.vehicle.client.name,
          reason: order.diagnostic ?? order.appointment?.reason ?? 'Diagnostico en curso',
          assigned: order.mechanic?.name ?? 'Sin asignar',
          urgent: /freno|motor|electr|ruido|urgente/i.test(
            `${order.diagnostic ?? ''} ${order.appointment?.reason ?? ''}`,
          ),
          scheduledFor: order.createdAt,
          time: order.appointment?.time ?? null,
        })),
      reparacion: workOrders
        .filter((order) => ['waiting_parts', 'repairing'].includes(order.status))
        .map((order) => ({
          id: order.id,
          itemType: 'workOrder',
          vehicleId: order.vehicleId,
          plate: order.vehicle.plate,
          model: `${order.vehicle.brand} ${order.vehicle.model}`,
          client: order.vehicle.client.name,
          reason: order.diagnostic ?? order.appointment?.reason ?? 'Reparacion en curso',
          assigned: order.mechanic?.name ?? 'Sin asignar',
          urgent: /freno|motor|electr|ruido|urgente/i.test(
            `${order.diagnostic ?? ''} ${order.appointment?.reason ?? ''}`,
          ),
          scheduledFor: order.createdAt,
          time: order.appointment?.time ?? null,
        })),
      listos: workOrders
        .filter((order) => order.status === 'finished')
        .map((order) => ({
          id: order.id,
          itemType: 'workOrder',
          vehicleId: order.vehicleId,
          plate: order.vehicle.plate,
          model: `${order.vehicle.brand} ${order.vehicle.model}`,
          client: order.vehicle.client.name,
          reason: order.diagnostic ?? order.appointment?.reason ?? 'Listo para entregar',
          assigned: order.mechanic?.name ?? 'Sin asignar',
          urgent: false,
          scheduledFor: order.updatedAt,
          time: order.appointment?.time ?? null,
        })),
    };

    return [
      {
        id: 'agendados',
        title: 'Agendados (Pendientes)',
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        dot: 'bg-gray-400',
        items: itemsByColumn.agendados,
      },
      {
        id: 'diagnostico',
        title: 'En Diagnostico',
        color: 'bg-purple-50 text-purple-700 border-purple-100',
        dot: 'bg-purple-500',
        items: itemsByColumn.diagnostico,
      },
      {
        id: 'reparacion',
        title: 'En Reparacion',
        color: 'bg-blue-50 text-blue-700 border-blue-100',
        dot: 'bg-blue-500',
        items: itemsByColumn.reparacion,
      },
      {
        id: 'listos',
        title: 'Listos (Para Entregar)',
        color: 'bg-green-50 text-green-700 border-green-100',
        dot: 'bg-green-500',
        items: itemsByColumn.listos,
      },
    ].map((column) => ({
      ...column,
      count: column.items.length,
    }));
  }

  async moveBoardItem(
    user: SessionUser,
    input: {
      itemId: string;
      sourceColumn: 'agendados' | 'diagnostico' | 'reparacion' | 'listos';
      targetColumn: 'diagnostico' | 'reparacion' | 'listos';
    },
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    if (input.sourceColumn === input.targetColumn) {
      throw new BadRequestException('El item ya se encuentra en esa columna.');
    }

    if (input.sourceColumn === 'agendados') {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          id: input.itemId,
          tenantId: user.tenantId,
        },
        include: {
          workOrder: true,
        },
      });

      if (!appointment) {
        throw new NotFoundException('Turno no encontrado.');
      }

      if (appointment.workOrder) {
        throw new BadRequestException('Este turno ya fue ingresado al taller.');
      }

      const workOrder = await this.prisma.workOrder.create({
        data: {
          tenantId: user.tenantId,
          vehicleId: appointment.vehicleId,
          appointmentId: appointment.id,
          status: this.mapColumnToWorkOrderStatus(input.targetColumn),
          diagnostic: appointment.reason,
        },
      });

      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: input.targetColumn === 'listos' ? 'completed' : 'in_progress',
        },
      });

      return {
        ok: true,
        workOrderId: workOrder.id,
      };
    }

    const workOrder = await this.prisma.workOrder.findFirst({
      where: {
        id: input.itemId,
        tenantId: user.tenantId,
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada.');
    }

    await this.prisma.workOrder.update({
      where: { id: workOrder.id },
      data: {
        status: this.mapColumnToWorkOrderStatus(input.targetColumn),
      },
    });

    if (workOrder.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: workOrder.appointmentId },
        data: {
          status: input.targetColumn === 'listos' ? 'completed' : 'in_progress',
        },
      });
    }

    return {
      ok: true,
      workOrderId: workOrder.id,
    };
  }

  async listMechanics(user: SessionUser) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    return this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        role: {
          in: ['owner', 'employee', 'mechanic'],
        },
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getWorkOrderDetail(user: SessionUser, workOrderId: string) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    const order = await this.prisma.workOrder.findFirst({
      where: {
        id: workOrderId,
        tenantId: user.tenantId,
      },
      include: {
        vehicle: {
          include: {
            client: true,
          },
        },
        appointment: true,
        mechanic: true,
        parts: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de trabajo no encontrada.');
    }

    const updates = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        message: string;
        visibility: string;
        createdAt: Date;
      }>
    >(
      `SELECT id, title, message, visibility, "createdAt" as "createdAt"
       FROM "ClientUpdate"
       WHERE "workOrderId" = '${workOrderId.replace(/'/g, "''")}'
       ORDER BY "createdAt" DESC`,
    );

    return {
      id: order.id,
      status: order.status,
      diagnostic: order.diagnostic,
      laborCost: order.laborCost,
      totalCost: order.totalCost,
      recommendedNextRevisionDate: order.recommendedNextRevisionDate,
      recommendedNextRevisionNote: order.recommendedNextRevisionNote,
      mechanicId: order.mechanicId,
      mechanicName: order.mechanic?.name ?? null,
      parts: order.parts.map((part) => ({
        itemId: part.itemId,
        name: part.item.name,
        sku: part.item.sku,
        quantity: part.quantity,
        unitPrice: part.unitPrice,
        internalCost: part.internalCost,
        providedByClient: part.providedByClient,
      })),
      vehicle: {
        id: order.vehicle.id,
        plate: order.vehicle.plate,
        brand: order.vehicle.brand,
        model: order.vehicle.model,
        year: order.vehicle.year,
      },
      client: {
        id: order.vehicle.client.id,
        name: order.vehicle.client.name,
        phone: order.vehicle.client.phone,
        email: order.vehicle.client.email,
      },
      appointment: order.appointment
        ? {
            id: order.appointment.id,
            date: order.appointment.date,
            time: order.appointment.time,
            reason: order.appointment.reason,
            status: order.appointment.status,
          }
        : null,
      updates,
    };
  }

  async listInventoryItems(user: SessionUser) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    return this.prisma.inventoryItem.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ stockQuantity: 'asc' }, { name: 'asc' }],
    });
  }

  async createInventoryItem(
    user: SessionUser,
    input: {
      name: string;
      sku?: string;
      stockQuantity?: number;
      minAlert?: number;
      price?: number;
    },
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    return this.prisma.inventoryItem.create({
      data: {
        tenantId: user.tenantId,
        name: input.name,
        sku: input.sku?.trim() || null,
        stockQuantity: input.stockQuantity ?? 0,
        minAlert: input.minAlert ?? 1,
        price: input.price ?? 0,
      },
    });
  }

  async addPartToWorkOrder(
    user: SessionUser,
    workOrderId: string,
    input: {
      itemId: string;
      quantity: number;
      unitPrice: number;
      internalCost: number;
      providedByClient?: boolean;
    },
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    const order = await this.prisma.workOrder.findFirst({
      where: {
        id: workOrderId,
        tenantId: user.tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de trabajo no encontrada.');
    }

    const item = await this.prisma.inventoryItem.findFirst({
      where: {
        id: input.itemId,
        tenantId: user.tenantId,
      },
    });

    if (!item) {
      throw new NotFoundException('Repuesto no encontrado.');
    }

    const existing = await this.prisma.workOrderPart.findUnique({
      where: {
        workOrderId_itemId: {
          workOrderId,
          itemId: input.itemId,
        },
      },
    });

    if (existing) {
      await this.prisma.workOrderPart.update({
        where: {
          workOrderId_itemId: {
            workOrderId,
            itemId: input.itemId,
          },
        },
        data: {
          quantity: existing.quantity + input.quantity,
          unitPrice: input.unitPrice,
          internalCost: input.internalCost,
          providedByClient: input.providedByClient ?? false,
        },
      });
    } else {
      await this.prisma.workOrderPart.create({
        data: {
          workOrderId,
          itemId: input.itemId,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          internalCost: input.internalCost,
          providedByClient: input.providedByClient ?? false,
        },
      });
    }

    if (!(input.providedByClient ?? false)) {
      await this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          stockQuantity: {
            decrement: input.quantity,
          },
        },
      });
    }

    return this.getWorkOrderDetail(user, workOrderId);
  }

  async updateWorkOrder(
    user: SessionUser,
    workOrderId: string,
    input: {
      diagnostic?: string;
      laborCost?: number;
      totalCost?: number;
      recommendedNextRevisionDate?: string | null;
      recommendedNextRevisionNote?: string | null;
      mechanicId?: string | null;
      clientUpdateTitle?: string;
      clientUpdateMessage?: string;
    },
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    const order = await this.prisma.workOrder.findFirst({
      where: {
        id: workOrderId,
        tenantId: user.tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de trabajo no encontrada.');
    }

    if (input.mechanicId) {
      const mechanic = await this.prisma.user.findFirst({
        where: {
          id: input.mechanicId,
          tenantId: user.tenantId,
        },
      });

      if (!mechanic) {
        throw new BadRequestException('Mecanico no valido para este taller.');
      }
    }

    await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        diagnostic: input.diagnostic,
        laborCost: input.laborCost,
        totalCost: input.totalCost,
        recommendedNextRevisionDate:
          input.recommendedNextRevisionDate === null
            ? null
            : input.recommendedNextRevisionDate
              ? new Date(input.recommendedNextRevisionDate)
              : undefined,
        recommendedNextRevisionNote:
          input.recommendedNextRevisionNote === null
            ? null
            : input.recommendedNextRevisionNote,
        mechanicId:
          input.mechanicId === null ? null : input.mechanicId,
      },
    });

    if (input.clientUpdateTitle?.trim() && input.clientUpdateMessage?.trim()) {
      await this.prisma.$executeRaw`
        INSERT INTO "ClientUpdate" ("id", "workOrderId", "title", "message", "visibility", "createdAt")
        VALUES (gen_random_uuid()::text, ${workOrderId}, ${input.clientUpdateTitle.trim()}, ${input.clientUpdateMessage.trim()}, 'client', NOW())
      `;
    }

    return this.getWorkOrderDetail(user, workOrderId);
  }

  async listWorkOrders(user: SessionUser) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    const orders = await this.prisma.workOrder.findMany({
      where: {
        tenantId: user.tenantId,
      },
      include: {
        vehicle: {
          include: {
            client: true,
          },
        },
        mechanic: true,
        parts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => {
      const partsInternalCost = order.parts.reduce(
        (total, part) => total + part.internalCost * part.quantity,
        0,
      );
      const estimatedCost = Number((partsInternalCost + order.laborCost * 0.45).toFixed(2));
      const margin = Number((order.totalCost - estimatedCost).toFixed(2));

      return {
        id: order.id,
        vehicleId: order.vehicleId,
        vehiculo: `${order.vehicle.brand} ${order.vehicle.model}`,
        patente: order.vehicle.plate,
        cliente: order.vehicle.client.name,
        mecanico: order.mechanic?.name ?? 'Sin asignar',
        motivo: order.diagnostic ?? 'Trabajo en curso',
        estado: order.status,
        prioridad:
          margin < 80 ? 'urgente' : order.totalCost >= 300 ? 'alta' : 'normal',
        fechaIngreso: order.createdAt,
        estimado: order.totalCost,
        internalCost: estimatedCost,
        margin,
      };
    });
  }

  async getFinanceSummary(
    user: SessionUser,
    period: 'dia' | 'semana' | 'mes' | 'anio' | undefined = 'semana',
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin taller asociado.');
    }

    const safePeriod = period ?? 'semana';
    const periodStart = this.getPeriodStart(safePeriod);
    const orders = await this.prisma.workOrder.findMany({
      where: {
        tenantId: user.tenantId,
        createdAt: {
          gte: periodStart,
        },
      },
      include: {
        mechanic: true,
        parts: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const summary = {
      ingresos: 0,
      costos: 0,
      ganancia: 0,
    };

    const byMechanic = new Map<
      string,
      { name: string; value: number; color: string }
    >();
    const timeline = new Map<
      string,
      { name: string; ingresos: number; costos: number; ganancia: number }
    >();
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ef4444'];

    orders.forEach((order) => {
      const ingresos = order.totalCost;
      const costos =
        order.parts.reduce(
          (total, part) => total + part.internalCost * part.quantity,
          0,
        ) +
        order.laborCost * 0.45;
      const ganancia = ingresos - costos;

      summary.ingresos += ingresos;
      summary.costos += costos;
      summary.ganancia += ganancia;

      const mechanicName = order.mechanic?.name ?? 'Sin asignar';
      const currentMechanic = byMechanic.get(mechanicName);
      byMechanic.set(mechanicName, {
        name: mechanicName,
        value: Number(((currentMechanic?.value ?? 0) + ingresos).toFixed(2)),
        color:
          currentMechanic?.color ??
          palette[byMechanic.size % palette.length],
      });

      const bucketLabel = this.formatTimelineLabel(order.createdAt, safePeriod);
      const currentBucket = timeline.get(bucketLabel) ?? {
        name: bucketLabel,
        ingresos: 0,
        costos: 0,
        ganancia: 0,
      };
      currentBucket.ingresos = Number((currentBucket.ingresos + ingresos).toFixed(2));
      currentBucket.costos = Number((currentBucket.costos + costos).toFixed(2));
      currentBucket.ganancia = Number((currentBucket.ganancia + ganancia).toFixed(2));
      timeline.set(bucketLabel, currentBucket);
    });

    return {
      period: safePeriod,
      summary: {
        ingresos: Number(summary.ingresos.toFixed(2)),
        costos: Number(summary.costos.toFixed(2)),
        ganancia: Number(summary.ganancia.toFixed(2)),
      },
      byMechanic: Array.from(byMechanic.values()).sort((a, b) => b.value - a.value),
      timeline: Array.from(timeline.values()),
    };
  }

  private joinSqlValues(values: string[]) {
    return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
  }

  private normalizeOptionalText(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private async buildClientVehicleWhere(vehicleId: string, clientId: string | null) {
    if (!clientId) {
      return { id: vehicleId, clientId: '__missing__' };
    }

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { email: true },
    });

    if (!client?.email) {
      return { id: vehicleId, clientId };
    }

    return {
      id: vehicleId,
      client: {
        email: client.email,
      },
    };
  }

  private async ensureVehicleProfileTable() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VehicleProfile" (
        "vehicleId" TEXT PRIMARY KEY REFERENCES "Vehicle"("id") ON DELETE CASCADE,
        alias TEXT NULL,
        color TEXT NULL,
        notes TEXT NULL,
        "insuranceProvider" TEXT NULL,
        "policyNumber" TEXT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private async getVehicleProfile(vehicleId: string) {
    const profiles = await this.getVehicleProfiles([vehicleId]);
    return profiles.get(vehicleId) ?? this.emptyVehicleProfile();
  }

  private async getVehicleProfiles(vehicleIds: string[]) {
    await this.ensureVehicleProfileTable();

    if (!vehicleIds.length) {
      return new Map<string, VehicleProfileRow>();
    }

    const rows = await this.prisma.$queryRawUnsafe<VehicleProfileRow[]>(
      `SELECT
        "vehicleId" as "vehicleId",
        alias,
        color,
        notes,
        "insuranceProvider" as "insuranceProvider",
        "policyNumber" as "policyNumber"
       FROM "VehicleProfile"
       WHERE "vehicleId" IN (${this.joinSqlValues(vehicleIds)})`,
    );

    return new Map(rows.map((row) => [row.vehicleId, row]));
  }

  private emptyVehicleProfile(): Omit<VehicleProfileRow, 'vehicleId'> {
    return {
      alias: null,
      color: null,
      notes: null,
      insuranceProvider: null,
      policyNumber: null,
    };
  }

  private async resolveRelatedPortalClients(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { email: true },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const where = client.email
      ? {
          email: client.email,
        }
      : {
          id: clientId,
        };

    return this.prisma.client.findMany({
      where,
      include: {
        tenant: true,
        vehicles: {
          include: {
            workOrders: {
              include: {
                mechanic: true,
                appointment: true,
                parts: {
                  include: {
                    item: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            appointments: {
              orderBy: [{ date: 'desc' }, { time: 'desc' }],
            },
            tenant: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  private groupPortalVehicles(
    vehicles: Array<{
      id: string;
      tenantId: string;
      tenant: { name: string };
      clientId: string;
      plate: string;
      brand: string;
      model: string;
      year: number | null;
      createdAt: Date;
      updatedAt: Date;
      appointments: Array<{
        id: string;
        date: Date;
        time: string;
        reason: string;
        status: string;
      }>;
      workOrders: Array<{
        id: string;
        status: string;
        diagnostic: string | null;
        laborCost: number;
        totalCost: number;
        createdAt: Date;
        recommendedNextRevisionDate: Date | null;
        recommendedNextRevisionNote: string | null;
        mechanic: { name: string } | null;
        appointment: {
          id: string;
          date: Date;
          time: string;
          reason: string;
          status: string;
        } | null;
        parts: Array<{
          quantity: number;
          unitPrice: number;
          internalCost: number;
          providedByClient: boolean;
          item: {
            name: string;
          };
        }>;
      }>;
      owner: {
        id: string;
        name: string;
        phone: string | null;
        email: string | null;
      };
    }>,
    updates: Array<{
      id: string;
      workOrderId: string;
      title: string;
      message: string;
      visibility: string;
      createdAt: Date;
    }>,
    profiles: Map<string, VehicleProfileRow>,
  ) {
    const grouped = new Map<
      string,
      {
        id: string;
        tenantId: string;
        workshopName: string;
        workshops: string[];
        plate: string;
        brand: string;
        model: string;
        year: number | null;
        profile: Omit<VehicleProfileRow, 'vehicleId'>;
        client: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
        };
        workOrders: Array<{
          id: string;
          status: string;
          diagnostic: string | null;
          laborCost: number;
          totalCost: number;
          createdAt: Date;
          recommendedNextRevisionDate: Date | null;
          recommendedNextRevisionNote: string | null;
          mechanic: { name: string } | null;
          appointment: {
            id: string;
            date: Date;
            time: string;
            reason: string;
            status: string;
          } | null;
          parts: Array<{
            quantity: number;
            unitPrice: number;
            internalCost: number;
            providedByClient: boolean;
            item: {
              name: string;
            };
          }>;
          updates: Array<{
            id: string;
            title: string;
            message: string;
            visibility: string;
            createdAt: Date;
          }>;
          tenantId: string;
          workshopName: string;
        }>;
      }
    >();

    vehicles.forEach((vehicle) => {
      const key = vehicle.plate.trim().toUpperCase();
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          id: vehicle.id,
          tenantId: vehicle.tenantId,
          workshopName: vehicle.tenant.name,
          workshops: [vehicle.tenant.name],
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          profile: profiles.get(vehicle.id) ?? this.emptyVehicleProfile(),
          client: vehicle.owner,
          workOrders: vehicle.workOrders.map((order) => ({
            ...order,
            tenantId: vehicle.tenantId,
            workshopName: vehicle.tenant.name,
            updates: updates.filter((update) => update.workOrderId === order.id),
          })),
        });
        return;
      }

      if (!existing.workshops.includes(vehicle.tenant.name)) {
        existing.workshops.push(vehicle.tenant.name);
      }
      if (!existing.client.phone && vehicle.owner.phone) {
        existing.client.phone = vehicle.owner.phone;
      }
      if (!existing.client.email && vehicle.owner.email) {
        existing.client.email = vehicle.owner.email;
      }
      if (!existing.profile.alias) {
        existing.profile.alias = profiles.get(vehicle.id)?.alias ?? existing.profile.alias;
      }
      if (!existing.profile.color) {
        existing.profile.color = profiles.get(vehicle.id)?.color ?? existing.profile.color;
      }
      if (!existing.profile.notes) {
        existing.profile.notes = profiles.get(vehicle.id)?.notes ?? existing.profile.notes;
      }
      if (!existing.profile.insuranceProvider) {
        existing.profile.insuranceProvider =
          profiles.get(vehicle.id)?.insuranceProvider ?? existing.profile.insuranceProvider;
      }
      if (!existing.profile.policyNumber) {
        existing.profile.policyNumber =
          profiles.get(vehicle.id)?.policyNumber ?? existing.profile.policyNumber;
      }
      existing.workOrders.push(
        ...vehicle.workOrders.map((order) => ({
          ...order,
          tenantId: vehicle.tenantId,
          workshopName: vehicle.tenant.name,
          updates: updates.filter((update) => update.workOrderId === order.id),
        })),
      );
    });

    return Array.from(grouped.values())
      .map((vehicle) => ({
        ...vehicle,
        workshopName:
          vehicle.workshops.length === 1
            ? vehicle.workshops[0]
            : `${vehicle.workshops[0]} + ${vehicle.workshops.length - 1} talleres`,
        workOrders: vehicle.workOrders.sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
      }))
      .sort((left, right) => left.plate.localeCompare(right.plate));
  }

  private mapColumnToWorkOrderStatus(column: 'diagnostico' | 'reparacion' | 'listos') {
    if (column === 'diagnostico') {
      return 'estimating';
    }

    if (column === 'reparacion') {
      return 'repairing';
    }

    return 'finished';
  }

  private getPeriodStart(period: 'dia' | 'semana' | 'mes' | 'anio') {
    const now = new Date();
    const start = new Date(now);

    if (period === 'dia') {
      start.setHours(0, 0, 0, 0);
      return start;
    }

    if (period === 'semana') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return start;
    }

    if (period === 'mes') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return start;
    }

    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private formatTimelineLabel(date: Date, period: 'dia' | 'semana' | 'mes' | 'anio') {
    if (period === 'anio') {
      return date.toLocaleDateString('es-AR', { month: 'short' });
    }

    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: period === 'mes' ? '2-digit' : undefined,
      weekday: period === 'semana' ? 'short' : undefined,
    });
  }
}
