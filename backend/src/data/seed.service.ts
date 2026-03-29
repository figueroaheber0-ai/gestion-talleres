import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password.util';

type DemoWorkshop = {
  name: string;
  slug: string;
  plan: string;
};

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  private readonly workshops: DemoWorkshop[] = [
    { name: 'Taller 2R', slug: 'taller2r', plan: 'pro' },
    { name: 'Sur Performance Garage', slug: 'sur', plan: 'starter' },
    { name: 'Centro Fleet Service', slug: 'centro', plan: 'pro' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureAuxiliaryTables();

      const tenants = await this.prisma.tenant.count();
      if (tenants > 0) {
        return;
      }

      await this.seedDatabase();
      this.logger.log('Demo SQL seed completed with 3 workshops.');
    } catch (error) {
      this.logger.warn('Seed skipped because the database is not available.');
      if (error instanceof Error) {
        this.logger.warn(error.message);
      }
    }
  }

  private async ensureAuxiliaryTables() {
    await this.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ClientPortalAccount" (
        "id" TEXT PRIMARY KEY,
        "clientId" TEXT NOT NULL UNIQUE REFERENCES "Client"("id") ON DELETE CASCADE,
        "passwordHash" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT PRIMARY KEY,
        "tokenHash" TEXT NOT NULL UNIQUE,
        "actorType" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "userId" TEXT NULL REFERENCES "User"("id") ON DELETE SET NULL,
        "clientId" TEXT NULL REFERENCES "Client"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "userAgent" TEXT NULL,
        "ipAddress" TEXT NULL
      );
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ClientUpdate" (
        "id" TEXT PRIMARY KEY,
        "workOrderId" TEXT NOT NULL REFERENCES "WorkOrder"("id") ON DELETE CASCADE,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "visibility" TEXT NOT NULL DEFAULT 'client',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StaffInvite" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "tokenHash" TEXT NOT NULL UNIQUE,
        "invitedByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "acceptedAt" TIMESTAMP(3) NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private async seedDatabase() {
    const random = this.createRandom(81);

    for (let index = 0; index < this.workshops.length; index += 1) {
      const workshop = this.workshops[index];
      const employeeCount = 3 + Math.floor(random() * 4);
      const tenant = await this.prisma.tenant.create({
        data: {
          name: workshop.name,
          subscriptionPlan: workshop.plan,
          maxCapacity: employeeCount + 4,
        },
      });

      const owner = await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: `Admin ${workshop.name}`,
          email: `admin+${workshop.slug}@taller2r.com`,
          role: 'owner',
          passwordHash: hashPassword('admin123'),
        },
      });

      if (index === 0) {
        await this.prisma.user.create({
          data: {
            tenantId: tenant.id,
            name: 'Herber Super Admin',
            email: 'herber.superadmin@81cc.app',
            role: 'superadmin',
            passwordHash: hashPassword('HerberAdmin2026!'),
          },
        });
      }

      const mechanics = [];
      for (let employeeIndex = 0; employeeIndex < employeeCount; employeeIndex += 1) {
        const mechanic = await this.prisma.user.create({
          data: {
            tenantId: tenant.id,
            name: this.pick(
              ['Carlos Gomez', 'Miguel Rios', 'Lucia Sosa', 'Nicolas Vega', 'Paula Ibarra', 'Sergio Luna'],
              random,
            ) + ` ${employeeIndex + 1}`,
            email: `mecanico${employeeIndex + 1}+${workshop.slug}@taller2r.com`,
            role: 'employee',
            passwordHash: hashPassword('1234'),
          },
        });
        mechanics.push(mechanic);
      }

      const inventoryItems = await Promise.all(
        [
          ['Aceite sintetico 5W30', 'ACE-5W30', 25, 4, 45],
          ['Pastillas de freno delanteras', 'FRE-PAD', 10, 2, 70],
          ['Filtro de aceite', 'FIL-OIL', 18, 4, 18],
          ['Bateria 12V 65Ah', 'BAT-65', 6, 1, 140],
          ['Kit distribucion', 'KIT-DIST', 5, 1, 210],
        ].map(([name, sku, stockQuantity, minAlert, price]) =>
          this.prisma.inventoryItem.create({
            data: {
              tenantId: tenant.id,
              name: String(name),
              sku: String(sku),
              stockQuantity: Number(stockQuantity),
              minAlert: Number(minAlert),
              price: Number(price),
            },
          }),
        ),
      );

      for (let clientIndex = 0; clientIndex < 5; clientIndex += 1) {
        const client = await this.prisma.client.create({
          data: {
            tenantId: tenant.id,
            name: this.pick(
              ['Juan Perez', 'Maria Gonzalez', 'Andrea Lopez', 'Lucas Ferreyra', 'Sofia Ruiz', 'Tomas Acosta'],
              random,
            ) + ` ${clientIndex + 1}`,
            phone: `+54 11 55${index}${clientIndex}0${clientIndex}`,
            email: `cliente${clientIndex + 1}+${workshop.slug}@mail.com`,
          },
        });

        if (clientIndex === 0) {
          await this.prisma.$executeRaw`
            INSERT INTO "ClientPortalAccount" ("id", "clientId", "passwordHash", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, ${client.id}, ${hashPassword('cliente123')}, NOW(), NOW())
          `;
        }

        const vehicle = await this.prisma.vehicle.create({
          data: {
            tenantId: tenant.id,
            clientId: client.id,
            plate: `${workshop.slug.substring(0, 2).toUpperCase()}${clientIndex + 1}8${index}${clientIndex}CD`,
            brand: this.pick(['Toyota', 'Ford', 'Volkswagen', 'Chevrolet', 'Renault', 'Fiat'], random),
            model: this.pick(['Hilux', 'Fiesta', 'Golf', 'Cruze', 'Kangoo', 'Cronos'], random),
            year: 2016 + Math.floor(random() * 9),
          },
        });

        const appointment = await this.prisma.appointment.create({
          data: {
            tenantId: tenant.id,
            vehicleId: vehicle.id,
            date: this.daysFromToday(clientIndex - 2),
            time: `${8 + clientIndex}:00`,
            reason: this.pick(
              [
                'Service preventivo y chequeo general',
                'Frenos largos y vibracion al frenar',
                'Testigo de motor encendido',
                'Cambio de distribucion y fluidos',
                'Ruido en tren delantero',
              ],
              random,
            ),
            status: clientIndex === 4 ? 'pending' : 'confirmed',
          },
        });

        if (clientIndex === 4) {
          continue;
        }

        const status = this.pick(['estimating', 'repairing', 'waiting_parts', 'finished'], random);
        const mechanic = this.pick(mechanics, random);
        const laborCost = 90 + Math.floor(random() * 160);
        const basePrice = 220 + Math.floor(random() * 260);
        const workOrder = await this.prisma.workOrder.create({
          data: {
            tenantId: tenant.id,
            vehicleId: vehicle.id,
            appointmentId: appointment.id,
            status,
            diagnostic: this.pick(
              [
                'Se detecto desgaste prematuro en tren delantero y se programo reemplazo.',
                'Trabajo de mantenimiento con observaciones sobre frenos delanteros.',
                'Reparacion electrica y chequeo de carga completados parcialmente.',
                'Diagnostico inicial realizado. Faltan repuestos para finalizar.',
              ],
              random,
            ),
            laborCost,
            totalCost: basePrice,
            recommendedNextRevisionDate: this.daysFromToday(90 + clientIndex * 10),
            recommendedNextRevisionNote: 'Volver para control preventivo y escaneo general.',
            mechanicId: mechanic.id,
          },
        });

        const selectedItems = [this.pick(inventoryItems, random), this.pick(inventoryItems, random)];
        for (const item of selectedItems) {
          const quantity = 1 + Math.floor(random() * 2);
          const internalCost = Math.max(10, Number((item.price * 0.65).toFixed(2)));
          await this.prisma.workOrderPart.upsert({
            where: {
              workOrderId_itemId: {
                workOrderId: workOrder.id,
                itemId: item.id,
              },
            },
            update: {
              quantity,
              unitPrice: item.price,
              internalCost,
            },
            create: {
              workOrderId: workOrder.id,
              itemId: item.id,
              quantity,
              unitPrice: item.price,
              internalCost,
              providedByClient: false,
            },
          });

          await this.prisma.inventoryItem.update({
            where: { id: item.id },
            data: {
              stockQuantity: {
                decrement: quantity,
              },
            },
          });
        }

        await this.prisma.$executeRaw`
          INSERT INTO "ClientUpdate" ("id", "workOrderId", "title", "message", "visibility", "createdAt")
          VALUES
            (gen_random_uuid()::text, ${workOrder.id}, 'Recepcion del vehiculo', 'Ingresamos el vehiculo al taller y comenzamos la revision inicial.', 'client', NOW()),
            (gen_random_uuid()::text, ${workOrder.id}, 'Avance tecnico', ${`Estado actual: ${status}. El equipo ya esta trabajando sobre la unidad.`}, 'client', NOW())
        `;
      }
    }
  }

  private createRandom(seed: number) {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  private pick<T>(items: T[], random: () => number) {
    return items[Math.floor(random() * items.length)];
  }

  private daysFromToday(offset: number) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date;
  }
}
