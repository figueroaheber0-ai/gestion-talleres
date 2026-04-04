import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './password.util';
import { SessionAudience, SessionUser, StaffRole } from './auth.types';

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

interface SessionRow {
  id: string;
  actorType: string;
  role: string;
  email: string;
  userId: string | null;
  clientId: string | null;
  expiresAt: Date;
  active: boolean;
}

interface ClientPortalAccountRow {
  clientId: string;
  passwordHash: string;
  clientName: string;
  clientEmail: string | null;
  tenantId: string;
}

interface ClientPortalIdentity {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  passwordHash: string | null;
}

interface TenantAdminSettingsRow {
  tenantId: string;
  status: string;
  planOverride: string | null;
  moderationNote: string | null;
  billingCycle: string | null;
  planStartAt: Date | null;
  planEndsAt: Date | null;
  nextRenewalAt: Date | null;
  autoRenew: boolean;
  effectiveMonthlyPrice: number | null;
  customPlanEnabled: boolean;
  customPlanName: string | null;
  customMonthlyPrice: number | null;
  customMaxUsers: number | null;
  customMaxWorkOrders: number | null;
  customFeatures: string | null;
  updatedAt: Date;
}

interface PlatformPlanRow {
  id: string;
  code: string;
  name: string;
  monthlyPrice: number;
  maxUsers: number;
  maxWorkOrders: number | null;
  features: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanChangeRequestRow {
  id: string;
  tenantId: string;
  requestedByUserId: string;
  requestedPlanCode: string;
  requestedBillingCycle: BillingCycle;
  status: "pending" | "approved" | "rejected";
  requestNote: string | null;
  reviewNote: string | null;
  reviewedByUserId: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  tenantName: string;
  requestedByName: string;
  requestedByEmail: string;
  reviewedByName: string | null;
}

type BillingCycle = 'monthly' | 'semiannual' | 'annual';
type ContractStatus = 'active' | 'expiring' | 'expired' | 'suspended';
type WarningLevel = 'normal' | '30d' | '15d' | '7d' | 'expired';
interface SessionAccessOptions {
  allowRestricted?: boolean;
}

interface TenantAccessState {
  restricted: boolean;
  trialEndsAt: Date | null;
  trialRemainingDays: number | null;
}

export interface StaffInviteRow {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
  tenantName: string;
  invitedByName: string;
}

@Injectable()
export class AuthService {
  private readonly sessionDurationMs = 1000 * 60 * 60 * 24 * 7;

  constructor(private readonly prisma: PrismaService) {}

  async loginWithCredentials(
    email: string,
    password: string,
    meta: RequestMeta,
    tenantId?: string,
  ) {
    const normalizedEmail = email.toLowerCase().trim();

    const users = await this.prisma.user.findMany({
      where: { email: normalizedEmail },
      include: {
        tenant: true,
      },
    });

    const matchingUsers = users.filter((candidate) =>
      verifyPassword(password, candidate.passwordHash),
    );

    const tenantStatuses = await this.getTenantStatusMap(
      matchingUsers.map((candidate) => candidate.tenantId),
    );

    if (matchingUsers.length > 1 && !tenantId) {
      return {
        requiresTenantSelection: true,
        accounts: matchingUsers
          .filter((user) => user.role === 'superadmin' || tenantStatuses.get(user.tenantId) !== 'suspended')
          .map((user) => ({
          tenantId: user.tenantId,
          tenantName: user.tenant.name,
          role: user.role,
          name: user.name,
          email: user.email,
          })),
      };
    }

    const user = tenantId
      ? matchingUsers.find((candidate) => candidate.tenantId === tenantId)
      : matchingUsers[0];

    if (user) {
      if (user.role !== 'superadmin' && tenantStatuses.get(user.tenantId) === 'suspended') {
        throw new UnauthorizedException('Este taller fue suspendido temporalmente por 81cc.');
      }
      return this.createSession(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: this.initialsFromName(user.name),
          audience: 'staff',
          tenantId: user.tenantId,
        },
        meta,
      );
    }

    throw new UnauthorizedException('Email o contrasena invalidos.');
  }

  async loginWithGoogle(email: string, name: string, meta: RequestMeta) {
    const normalizedEmail = email.toLowerCase().trim();
    const users = await this.prisma.user.findMany({
      where: { email: normalizedEmail },
      include: {
        tenant: true,
      },
    });

    if (!users.length) {
      throw new UnauthorizedException(
        'No encontramos una cuenta de 81cc asociada a tu Google.',
      );
    }

    const tenantStatuses = await this.getTenantStatusMap(
      users.map((candidate) => candidate.tenantId),
    );

    const availableUsers = users.filter(
      (candidate) =>
        candidate.role === 'superadmin' ||
        tenantStatuses.get(candidate.tenantId) !== 'suspended',
    );

    if (!availableUsers.length) {
      throw new UnauthorizedException(
        'Tu taller se encuentra suspendido temporalmente.',
      );
    }

    if (availableUsers.length > 1) {
      throw new UnauthorizedException(
        'Tu cuenta esta asociada a varios talleres. Inicia sesion con email y contrasena para elegir uno.',
      );
    }

    const user = availableUsers[0];
    return this.createSession(
      {
        id: user.id,
        name: user.name || name,
        email: user.email,
        role: user.role,
        avatar: this.initialsFromName(user.name || name),
        audience: 'staff',
        tenantId: user.tenantId,
      },
      meta,
    );
  }

  async registerOwner(input: {
    workshopName: string;
    name: string;
    email: string;
    password: string;
  }) {
    const email = input.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Ese email ya esta en uso.');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: input.workshopName,
        subscriptionPlan: 'free',
        maxCapacity: 8,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: input.name,
        email,
        role: 'owner',
        passwordHash: hashPassword(input.password),
      },
    });

    return {
      tenantId: tenant.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async registerClient(input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    plate: string;
    brand: string;
    model: string;
    year?: number;
  }) {
    const tenant = await this.getOrCreateDefaultTenant();
    const email = input.email.toLowerCase().trim();
    const normalizedPlate = input.plate.replace(/\s+/g, '').toUpperCase();

    const passwordHash = hashPassword(input.password);
    const knownClients = await this.findPortalClientsByEmail(email);
    let client = knownClients.find((candidate) => candidate.tenantId === tenant.id) ?? null;

    if (!client) {
      const createdClient = await this.prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: input.name,
          email,
          phone: input.phone,
        },
      });
      client = {
        ...createdClient,
        passwordHash: null,
      };
    } else if (client.name !== input.name || client.phone !== input.phone) {
      const updatedClient = await this.prisma.client.update({
        where: { id: client.id },
        data: {
          name: input.name,
          phone: input.phone,
        },
      });
      client = {
        ...updatedClient,
        passwordHash: client.passwordHash,
      };
    }

    const clientsToSync = [...knownClients.filter((candidate) => candidate.id !== client!.id), client];
    await Promise.all(
      clientsToSync.map((candidate) =>
        this.prisma.$executeRaw`
          INSERT INTO "ClientPortalAccount" ("id", "clientId", "passwordHash", "createdAt", "updatedAt")
          VALUES (${generateSessionToken()}, ${candidate!.id}, ${passwordHash}, NOW(), NOW())
          ON CONFLICT ("clientId")
          DO UPDATE SET
            "passwordHash" = ${passwordHash},
            "updatedAt" = NOW()
        `,
      ),
    );

    await this.prisma.vehicle.upsert({
      where: {
        tenantId_plate: {
          tenantId: tenant.id,
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
        tenantId: tenant.id,
        clientId: client.id,
        plate: normalizedPlate,
        brand: input.brand,
        model: input.model,
        year: input.year,
      },
    });

    return { ok: true };
  }

  async loginClient(
    email: string,
    password: string,
    meta: RequestMeta,
  ) {
    const identities = await this.findPortalClientsByEmail(email.toLowerCase().trim());
    const account = identities.find(
      (candidate) =>
        candidate.passwordHash && verifyPassword(password, candidate.passwordHash),
    );

    if (!account) {
      throw new UnauthorizedException('Credenciales del cliente invalidas.');
    }

    return this.createSession(
      {
        id: account.id,
        name: account.name,
        email: account.email ?? email,
        role: 'client',
        avatar: this.initialsFromName(account.name),
        audience: 'client',
        tenantId: account.tenantId,
        clientId: account.id,
      },
      meta,
    );
  }

  async readSession(token: string): Promise<SessionUser> {
    const [session] = await this.prisma.$queryRaw<SessionRow[]>`
      SELECT
        id,
        "actorType" as "actorType",
        role,
        email,
        "userId" as "userId",
        "clientId" as "clientId",
        "expiresAt" as "expiresAt",
        active
      FROM "Session"
      WHERE "tokenHash" = ${hashSessionToken(token)}
      LIMIT 1
    `;

    if (!session || !session.active || new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException('La sesion expiro o no existe.');
    }

    await this.prisma.$executeRaw`
      UPDATE "Session"
      SET "lastSeenAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${session.id}
    `;

    if (session.actorType === 'staff' && session.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: session.userId },
      });

      if (!user) {
        throw new UnauthorizedException('Sesion invalida.');
      }

      if (user.role !== 'superadmin') {
        const tenantStatus = await this.getTenantStatus(user.tenantId);
        if (tenantStatus === 'suspended') {
          throw new UnauthorizedException('Este taller fue suspendido temporalmente por 81cc.');
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: this.initialsFromName(user.name),
        audience: 'staff',
        tenantId: user.tenantId,
        sessionId: session.id,
      };
    }

    if (session.actorType === 'client' && session.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: session.clientId },
      });

      if (!client) {
        throw new UnauthorizedException('Sesion invalida.');
      }

      return {
        id: client.id,
        name: client.name,
        email: client.email ?? session.email,
        role: 'client',
        avatar: this.initialsFromName(client.name),
        audience: 'client',
        tenantId: client.tenantId,
        clientId: client.id,
        sessionId: session.id,
      };
    }

    throw new UnauthorizedException('Sesion invalida.');
  }

  async requireSession(
    authorization: string | undefined,
    audience?: SessionAudience,
    options?: SessionAccessOptions,
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      throw new UnauthorizedException('Falta el token de sesion.');
    }

    const user = await this.readSession(token);

    if (audience && user.audience !== audience) {
      throw new UnauthorizedException('No tienes permisos para esta vista.');
    }

    if (
      user.audience === 'staff' &&
      user.role !== 'superadmin' &&
      user.tenantId
    ) {
      const access = await this.resolveTenantAccess(user.tenantId);
      if (access.restricted && !options?.allowRestricted) {
        throw new ForbiddenException(
          'La prueba gratuita de 3 días finalizó. Selecciona un plan para reactivar el taller.',
        );
      }
    }

    return user;
  }

  async listSessions(viewer: SessionUser) {
    if (viewer.audience !== 'staff' || !viewer.tenantId) {
      throw new UnauthorizedException('No autorizado.');
    }

    return this.prisma.$queryRaw<
      Array<{
        id: string;
        actorType: string;
        role: string;
        email: string;
        createdAt: Date;
        lastSeenAt: Date;
        active: boolean;
      }>
    >`
      SELECT
        s.id,
        s."actorType" as "actorType",
        s.role,
        s.email,
        s."createdAt" as "createdAt",
        s."lastSeenAt" as "lastSeenAt",
        s.active
      FROM "Session" s
      LEFT JOIN "User" u ON u.id = s."userId"
      LEFT JOIN "Client" c ON c.id = s."clientId"
      WHERE u."tenantId" = ${viewer.tenantId} OR c."tenantId" = ${viewer.tenantId}
      ORDER BY s."createdAt" DESC
      LIMIT 25
    `;
  }

  async listStaff(viewer: SessionUser) {
    if (viewer.audience !== 'staff' || !viewer.tenantId || viewer.role !== 'owner') {
      throw new ForbiddenException('Solo el dueno puede administrar el equipo.');
    }

    return this.prisma.user.findMany({
      where: { tenantId: viewer.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async listStaffInvites(viewer: SessionUser) {
    if (viewer.audience !== 'staff' || !viewer.tenantId || viewer.role !== 'owner') {
      throw new ForbiddenException('Solo el dueno puede administrar invitaciones.');
    }

    return this.prisma.$queryRaw<StaffInviteRow[]>`
      SELECT
        si.id,
        si."tenantId" as "tenantId",
        si.email,
        si.name,
        si.role,
        si.status,
        si."expiresAt" as "expiresAt",
        si."createdAt" as "createdAt",
        si."acceptedAt" as "acceptedAt",
        t.name as "tenantName",
        u.name as "invitedByName"
      FROM "StaffInvite" si
      INNER JOIN "Tenant" t ON t.id = si."tenantId"
      INNER JOIN "User" u ON u.id = si."invitedByUserId"
      WHERE si."tenantId" = ${viewer.tenantId}
      ORDER BY si."createdAt" DESC
    `;
  }

  async createStaffInvite(
    viewer: SessionUser,
    input: { name: string; email: string; role: StaffRole },
  ) {
    if (viewer.audience !== 'staff' || !viewer.tenantId || viewer.role !== 'owner') {
      throw new ForbiddenException('Solo el dueno puede invitar mecanicos.');
    }

    const normalizedEmail = input.email.toLowerCase().trim();
    if (!['employee', 'superadmin'].includes(input.role)) {
      throw new UnauthorizedException('Solo puedes invitar perfiles operativos o de soporte.');
    }
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId: viewer.tenantId,
        email: normalizedEmail,
      },
    });

    if (existing) {
      throw new UnauthorizedException('Ese email ya pertenece al equipo del taller.');
    }

    const rawToken = generateSessionToken();
    const inviteId = generateSessionToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await this.prisma.$executeRaw`
      INSERT INTO "StaffInvite" (
        id,
        "tenantId",
        email,
        name,
        role,
        "tokenHash",
        "invitedByUserId",
        status,
        "expiresAt",
        "createdAt"
      )
      VALUES (
        ${inviteId},
        ${viewer.tenantId},
        ${normalizedEmail},
        ${input.name},
        ${input.role},
        ${hashSessionToken(rawToken)},
        ${viewer.id ?? ''},
        'pending',
        ${expiresAt},
        NOW()
      )
    `;

    return {
      ok: true,
      inviteToken: rawToken,
      expiresAt: expiresAt.getTime(),
    };
  }

  async readStaffInvite(token: string) {
    const [invite] = await this.prisma.$queryRaw<
      Array<StaffInviteRow & { tokenHash: string }>
    >`
      SELECT
        si.id,
        si."tenantId" as "tenantId",
        si.email,
        si.name,
        si.role,
        si.status,
        si."expiresAt" as "expiresAt",
        si."createdAt" as "createdAt",
        si."acceptedAt" as "acceptedAt",
        si."tokenHash" as "tokenHash",
        t.name as "tenantName",
        u.name as "invitedByName"
      FROM "StaffInvite" si
      INNER JOIN "Tenant" t ON t.id = si."tenantId"
      INNER JOIN "User" u ON u.id = si."invitedByUserId"
      WHERE si."tokenHash" = ${hashSessionToken(token)}
      LIMIT 1
    `;

    if (!invite || invite.status !== 'pending' || new Date(invite.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException('La invitacion es invalida o expiro.');
    }

    return invite;
  }

  async acceptStaffInvite(input: { token: string; password: string }) {
    const invite = await this.readStaffInvite(input.token);
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId: invite.tenantId,
        email: invite.email,
      },
    });

    if (existing) {
      throw new UnauthorizedException('La invitacion ya fue utilizada.');
    }

    const user = await this.prisma.user.create({
      data: {
        tenantId: invite.tenantId,
        name: invite.name,
        email: invite.email,
        role: invite.role,
        passwordHash: hashPassword(input.password),
      },
    });

    await this.prisma.$executeRaw`
      UPDATE "StaffInvite"
      SET status = 'accepted', "acceptedAt" = NOW()
      WHERE id = ${invite.id}
    `;

    return {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenantName: invite.tenantName,
    };
  }

  async getOwnerAccountStatus(viewer: SessionUser) {
    if (viewer.audience !== 'staff' || !viewer.tenantId || viewer.role !== 'owner') {
      throw new ForbiddenException('Solo el dueño puede ver el estado de la cuenta.');
    }

    await this.ensureAdminTables();

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: viewer.tenantId },
      include: {
        users: {
          select: { id: true, role: true },
        },
        workOrders: {
          select: { id: true, status: true, totalCost: true },
        },
      },
    });

    if (!tenant) {
      throw new UnauthorizedException('No encontramos el taller de esta sesión.');
    }

    const settings = await this.getTenantAdminSettings(tenant.id);
    const contract = this.resolveTenantContract(tenant, settings ?? undefined);
    const access = await this.resolveTenantAccess(tenant.id);
    const effectivePlanCode = settings?.planOverride ?? tenant.subscriptionPlan;
    const [pendingRequest] = await this.prisma.$queryRaw<
      Array<{
        id: string;
        requestedPlanCode: string;
        requestedBillingCycle: BillingCycle;
        createdAt: Date;
      }>
    >`
      SELECT
        id,
        "requestedPlanCode" as "requestedPlanCode",
        "requestedBillingCycle" as "requestedBillingCycle",
        "createdAt" as "createdAt"
      FROM "PlanChangeRequest"
      WHERE "tenantId" = ${tenant.id} AND status = 'pending'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const plans = await this.listBasicCatalogPlans();
    const plan = plans.find((item) => item.code === effectivePlanCode) ?? null;

    const customPlan =
      settings?.customPlanEnabled &&
      settings.customPlanName &&
      settings.customMonthlyPrice !== null &&
      settings.customMaxUsers !== null
        ? {
            enabled: true,
            name: settings.customPlanName,
            monthlyPrice: settings.customMonthlyPrice,
            maxUsers: settings.customMaxUsers,
            maxWorkOrders: settings.customMaxWorkOrders,
            features: settings.customFeatures ? JSON.parse(settings.customFeatures) : [],
          }
        : null;

    const totalUsers = tenant.users.length;
    const activeOrders = tenant.workOrders.filter((order) =>
      ['pending', 'estimating', 'waiting_parts', 'repairing'].includes(order.status),
    ).length;
    const maxUsers = customPlan?.maxUsers ?? plan?.maxUsers ?? tenant.maxCapacity;
    const maxWorkOrders = customPlan?.maxWorkOrders ?? plan?.maxWorkOrders ?? null;
    const remainingUsers = Math.max(0, maxUsers - totalUsers);
    const remainingWorkOrders =
      maxWorkOrders === null ? null : Math.max(0, maxWorkOrders - activeOrders);
    const monthlyPrice =
      settings?.effectiveMonthlyPrice ??
      customPlan?.monthlyPrice ??
      plan?.monthlyPrice ??
      0;

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      status: settings?.status ?? 'active',
      moderationNote: settings?.moderationNote ?? null,
      plan: tenant.subscriptionPlan,
      effectivePlan: effectivePlanCode,
      effectivePlanLabel: customPlan?.name ?? plan?.name ?? effectivePlanCode,
      billingMode: customPlan ? 'custom' : 'catalog',
      contractStatus: contract.contractStatus,
      warningLevel: contract.warningLevel,
      billingCycle: contract.billingCycle,
      planStartAt: contract.planStartAt,
      planEndsAt: contract.planEndsAt,
      nextRenewalAt: contract.nextRenewalAt,
      autoRenew: contract.autoRenew,
      remainingDays: contract.remainingDays,
      monthlyPrice,
      maxUsers,
      totalUsers,
      remainingUsers,
      maxWorkOrders,
      activeOrders,
      remainingWorkOrders,
      features: customPlan?.features ?? (plan?.features ? JSON.parse(plan.features) : []),
      monthlyRevenue: tenant.workOrders.reduce((sum, order) => sum + order.totalCost, 0),
      trialEndsAt: access.trialEndsAt,
      trialRemainingDays: access.trialRemainingDays,
      restricted: access.restricted,
      availablePlans: plans.map((catalogPlan) => ({
        code: catalogPlan.code,
        name: catalogPlan.name,
        monthlyPrice: catalogPlan.monthlyPrice,
        maxUsers: catalogPlan.maxUsers,
        maxWorkOrders: catalogPlan.maxWorkOrders,
        features: catalogPlan.features ? JSON.parse(catalogPlan.features) : [],
      })),
      pendingPlanRequest: pendingRequest
        ? {
            id: pendingRequest.id,
            requestedPlanCode: pendingRequest.requestedPlanCode,
            requestedBillingCycle: pendingRequest.requestedBillingCycle,
            createdAt: pendingRequest.createdAt,
          }
        : null,
    };
  }

  async selectOwnerPlan(
    viewer: SessionUser,
    input: { planCode: string; billingCycle?: BillingCycle; note?: string },
  ) {
    if (viewer.audience !== 'staff' || !viewer.tenantId || viewer.role !== 'owner') {
      throw new ForbiddenException('Solo el dueño puede solicitar un plan.');
    }

    await this.ensureAdminTables();
    const planCode = input.planCode.trim().toLowerCase();
    const billingCycle = this.normalizeBillingCycle(input.billingCycle);
    const plans = await this.listBasicCatalogPlans();
    const selectedPlan = plans.find((plan) => plan.code === planCode && plan.active);

    if (!selectedPlan) {
      throw new UnauthorizedException('El plan seleccionado no está disponible para contratación.');
    }

    const requestId = generateSessionToken();
    await this.prisma.$executeRaw`
      UPDATE "PlanChangeRequest"
      SET status = 'rejected',
          "reviewNote" = 'Reemplazada por una solicitud más reciente.',
          "reviewedByUserId" = ${viewer.id},
          "reviewedAt" = NOW()
      WHERE "tenantId" = ${viewer.tenantId} AND status = 'pending'
    `;
    await this.prisma.$executeRaw`
      INSERT INTO "PlanChangeRequest" (
        id,
        "tenantId",
        "requestedByUserId",
        "requestedPlanCode",
        "requestedBillingCycle",
        status,
        "requestNote",
        "reviewNote",
        "reviewedByUserId",
        "createdAt",
        "reviewedAt"
      )
      VALUES (
        ${requestId},
        ${viewer.tenantId},
        ${viewer.id},
        ${selectedPlan.code},
        ${billingCycle},
        'pending',
        ${input.note?.trim() || null},
        NULL,
        NULL,
        NOW(),
        NULL
      )
    `;

    return this.getOwnerAccountStatus(viewer);
  }

  async createSuperadminAccount(
    viewer: SessionUser,
    input: { name: string; email: string; password: string; tenantId?: string },
  ) {
    this.assertSuperadmin(viewer);
    const tenantId = input.tenantId?.trim() || viewer.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('No se encontró tenant para crear el superadmin.');
    }

    const name = input.name.trim();
    const email = input.email.toLowerCase().trim();
    const password = input.password;
    if (!name || !email || password.length < 6) {
      throw new UnauthorizedException('Completa nombre, email y contraseña válida.');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new UnauthorizedException('El taller seleccionado no existe.');
    }

    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email },
    });
    if (existing) {
      throw new UnauthorizedException('Ese email ya existe en este taller.');
    }

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        name,
        email,
        role: 'superadmin',
        passwordHash: hashPassword(password),
      },
    });

    return {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async listPlanChangeRequestsForSuperadmin(viewer: SessionUser) {
    this.assertSuperadmin(viewer);
    await this.ensureAdminTables();

    return this.prisma.$queryRaw<PlanChangeRequestRow[]>`
      SELECT
        req.id,
        req."tenantId" as "tenantId",
        req."requestedByUserId" as "requestedByUserId",
        req."requestedPlanCode" as "requestedPlanCode",
        req."requestedBillingCycle" as "requestedBillingCycle",
        req.status,
        req."requestNote" as "requestNote",
        req."reviewNote" as "reviewNote",
        req."reviewedByUserId" as "reviewedByUserId",
        req."createdAt" as "createdAt",
        req."reviewedAt" as "reviewedAt",
        t.name as "tenantName",
        requester.name as "requestedByName",
        requester.email as "requestedByEmail",
        reviewer.name as "reviewedByName"
      FROM "PlanChangeRequest" req
      INNER JOIN "Tenant" t ON t.id = req."tenantId"
      INNER JOIN "User" requester ON requester.id = req."requestedByUserId"
      LEFT JOIN "User" reviewer ON reviewer.id = req."reviewedByUserId"
      ORDER BY req."createdAt" DESC
    `;
  }

  async resolvePlanChangeRequest(
    viewer: SessionUser,
    requestId: string,
    input: { action: "approve" | "reject"; reviewNote?: string },
  ) {
    this.assertSuperadmin(viewer);
    await this.ensureAdminTables();

    const [request] = await this.prisma.$queryRaw<
      Array<{
        id: string;
        tenantId: string;
        requestedPlanCode: string;
        requestedBillingCycle: BillingCycle;
        status: "pending" | "approved" | "rejected";
      }>
    >`
      SELECT
        id,
        "tenantId" as "tenantId",
        "requestedPlanCode" as "requestedPlanCode",
        "requestedBillingCycle" as "requestedBillingCycle",
        status
      FROM "PlanChangeRequest"
      WHERE id = ${requestId}
      LIMIT 1
    `;

    if (!request) {
      throw new UnauthorizedException('Solicitud no encontrada.');
    }
    if (request.status !== 'pending') {
      throw new UnauthorizedException('La solicitud ya fue resuelta.');
    }

    if (input.action === "approve") {
      await this.applyApprovedCatalogPlan(
        request.tenantId,
        request.requestedPlanCode,
        request.requestedBillingCycle,
      );
    }

    await this.prisma.$executeRaw`
      UPDATE "PlanChangeRequest"
      SET status = ${input.action === "approve" ? "approved" : "rejected"},
          "reviewNote" = ${input.reviewNote?.trim() || null},
          "reviewedByUserId" = ${viewer.id},
          "reviewedAt" = NOW()
      WHERE id = ${request.id}
    `;

    return this.listPlanChangeRequestsForSuperadmin(viewer);
  }

  async listTenantsForSuperadmin(viewer: SessionUser) {
    this.assertSuperadmin(viewer);
    await this.ensureAdminTables();

    const tenants = await this.prisma.tenant.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
        workOrders: {
          select: { id: true, status: true, totalCost: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const settings = await this.prisma.$queryRaw<TenantAdminSettingsRow[]>`
      SELECT
        "tenantId" as "tenantId",
        status,
        "planOverride" as "planOverride",
        "moderationNote" as "moderationNote",
        "billingCycle" as "billingCycle",
        "planStartAt" as "planStartAt",
        "planEndsAt" as "planEndsAt",
        "nextRenewalAt" as "nextRenewalAt",
        "autoRenew" as "autoRenew",
        "effectiveMonthlyPrice" as "effectiveMonthlyPrice",
        "customPlanEnabled" as "customPlanEnabled",
        "customPlanName" as "customPlanName",
        "customMonthlyPrice" as "customMonthlyPrice",
        "customMaxUsers" as "customMaxUsers",
        "customMaxWorkOrders" as "customMaxWorkOrders",
        "customFeatures" as "customFeatures",
        "updatedAt" as "updatedAt"
      FROM "TenantAdminSettings"
    `;
    const planRows = await this.prisma.$queryRaw<PlatformPlanRow[]>`
      SELECT
        id,
        code,
        name,
        "monthlyPrice" as "monthlyPrice",
        "maxUsers" as "maxUsers",
        "maxWorkOrders" as "maxWorkOrders",
        features,
        active,
        "createdAt" as "createdAt",
        "updatedAt" as "updatedAt"
      FROM "PlatformPlan"
    `;
    const settingsMap = new Map(settings.map((item) => [item.tenantId, item]));
    const priceMap = new Map(planRows.map((plan) => [plan.code, plan.monthlyPrice]));

    return tenants.map((tenant) => {
      const tenantSettings = settingsMap.get(tenant.id);
      const contract = this.resolveTenantContract(tenant, tenantSettings);
      const effectivePlanCode =
        tenantSettings?.planOverride ?? tenant.subscriptionPlan;
      const customPlan =
        tenantSettings?.customPlanEnabled &&
        tenantSettings.customPlanName &&
        tenantSettings.customMonthlyPrice !== null &&
        tenantSettings.customMaxUsers !== null
          ? {
              enabled: true,
              name: tenantSettings.customPlanName,
              monthlyPrice: tenantSettings.customMonthlyPrice,
              maxUsers: tenantSettings.customMaxUsers,
              maxWorkOrders: tenantSettings.customMaxWorkOrders,
              features: tenantSettings.customFeatures
                ? JSON.parse(tenantSettings.customFeatures)
                : [],
            }
          : null;
      return {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.subscriptionPlan,
        effectivePlan: effectivePlanCode,
        effectivePlanLabel: customPlan?.name ?? effectivePlanCode,
        billingMode: customPlan ? 'custom' : 'catalog',
        customPlan,
        status: tenantSettings?.status ?? 'active',
        contractStatus: contract.contractStatus,
        warningLevel: contract.warningLevel,
        moderationNote: tenantSettings?.moderationNote ?? null,
        maxCapacity: tenant.maxCapacity,
        createdAt: tenant.createdAt,
        billingCycle: contract.billingCycle,
        planStartAt: contract.planStartAt,
        planEndsAt: contract.planEndsAt,
        nextRenewalAt: contract.nextRenewalAt,
        autoRenew: contract.autoRenew,
        remainingDays: contract.remainingDays,
        effectiveMonthlyPrice:
          tenantSettings?.effectiveMonthlyPrice ??
          customPlan?.monthlyPrice ??
          priceMap.get(effectivePlanCode) ??
          0,
        owner:
          tenant.users.find((user) => user.role === 'owner')?.name ??
          tenant.users[0]?.name ??
          'Sin dueno',
        ownerEmail:
          tenant.users.find((user) => user.role === 'owner')?.email ??
          tenant.users[0]?.email ??
          '',
        employees: tenant.users.filter((user) => user.role === 'employee').length,
        totalUsers: tenant.users.length,
        activeOrders: tenant.workOrders.filter((order) =>
          ['pending', 'estimating', 'waiting_parts', 'repairing'].includes(order.status),
        ).length,
        monthlyRevenue: tenant.workOrders.reduce((sum, order) => sum + order.totalCost, 0),
      };
    });
  }

  async listPlansForSuperadmin(viewer: SessionUser) {
    this.assertSuperadmin(viewer);
    await this.ensureAdminTables();

    const plans = await this.prisma.$queryRaw<PlatformPlanRow[]>`
      SELECT
        id,
        code,
        name,
        "monthlyPrice" as "monthlyPrice",
        "maxUsers" as "maxUsers",
        "maxWorkOrders" as "maxWorkOrders",
        features,
        active,
        "createdAt" as "createdAt",
        "updatedAt" as "updatedAt"
      FROM "PlatformPlan"
      ORDER BY "monthlyPrice" ASC, name ASC
    `;

    return plans.map((plan) => ({
      ...plan,
      features: plan.features ? JSON.parse(plan.features) : [],
    }));
  }

  async upsertPlanForSuperadmin(
    viewer: SessionUser,
    input: {
      code: string;
      name: string;
      monthlyPrice: number;
      maxUsers: number;
      maxWorkOrders?: number | null;
      features?: string[];
      active?: boolean;
    },
  ) {
    this.assertSuperadmin(viewer);
    await this.ensureAdminTables();

    const code = input.code.trim().toLowerCase();
    const name = input.name.trim();
    const planId = `plan-${code}`;
    if (!code || !name) {
      throw new UnauthorizedException('El plan debe tener codigo y nombre.');
    }

    await this.prisma.$executeRaw`
      INSERT INTO "PlatformPlan" (
        id,
        code,
        name,
        "monthlyPrice",
        "maxUsers",
        "maxWorkOrders",
        features,
        active,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${planId},
        ${code},
        ${name},
        ${input.monthlyPrice},
        ${input.maxUsers},
        ${input.maxWorkOrders ?? null},
        ${JSON.stringify(input.features ?? [])},
        ${input.active ?? true},
        NOW(),
        NOW()
      )
      ON CONFLICT (code)
      DO UPDATE SET
        name = ${name},
        "monthlyPrice" = ${input.monthlyPrice},
        "maxUsers" = ${input.maxUsers},
        "maxWorkOrders" = ${input.maxWorkOrders ?? null},
        features = ${JSON.stringify(input.features ?? [])},
        active = ${input.active ?? true},
        "updatedAt" = NOW()
    `;

    return this.listPlansForSuperadmin(viewer);
  }

  async getPlatformFinanceSummary(viewer: SessionUser) {
    this.assertSuperadmin(viewer);
    await this.ensureAdminTables();

    const [plans, tenants] = await Promise.all([
      this.listPlansForSuperadmin(viewer),
      this.listTenantsForSuperadmin(viewer),
    ]);
    const priceMap = new Map(plans.map((plan) => [plan.code, plan.monthlyPrice]));
    const resolveMrr = (tenant: (typeof tenants)[number]) =>
      tenant.customPlan?.monthlyPrice ?? priceMap.get(tenant.effectivePlan) ?? 0;
    const activeTenants = tenants.filter((tenant) => tenant.status === 'active');
    const suspendedTenants = tenants.filter((tenant) => tenant.status === 'suspended');
    const mrr = activeTenants.reduce(
      (sum, tenant) => sum + resolveMrr(tenant),
      0,
    );
    const projectedArr = mrr * 12;
    const processedVolume = tenants.reduce((sum, tenant) => sum + tenant.monthlyRevenue, 0);
    const arpa = activeTenants.length ? mrr / activeTenants.length : 0;
    const takeRate = processedVolume ? (mrr / processedVolume) * 100 : 0;
    const customPlans = activeTenants.filter((tenant) => tenant.customPlan).length;
    const expiringTenants = tenants.filter((tenant) =>
      tenant.contractStatus === 'expiring' || tenant.contractStatus === 'expired',
    );
    const expiringSummary = {
      dueIn30Days: tenants.filter((tenant) => tenant.warningLevel === '30d').length,
      dueIn15Days: tenants.filter((tenant) => tenant.warningLevel === '15d').length,
      dueIn7Days: tenants.filter((tenant) => tenant.warningLevel === '7d').length,
      expired: tenants.filter((tenant) => tenant.warningLevel === 'expired').length,
      atRiskMrr: expiringTenants.reduce((sum, tenant) => sum + resolveMrr(tenant), 0),
    };

    const byPlan = plans.map((plan) => {
      const tenantsOnPlan = tenants.filter((tenant) => tenant.effectivePlan === plan.code);
      const activeOnPlan = tenantsOnPlan.filter((tenant) => tenant.status === 'active');
      return {
        code: plan.code,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        tenants: tenantsOnPlan.length,
        activeTenants: activeOnPlan.length,
        mrr: activeOnPlan.reduce((sum, tenant) => sum + resolveMrr(tenant), 0),
      };
    });

    return {
      headline: {
        activeTenants: activeTenants.length,
        suspendedTenants: suspendedTenants.length,
        mrr,
        projectedArr,
        processedVolume,
        arpa,
        takeRate,
        customPlans,
      },
      descriptions: {
        activeTenants: 'Cantidad de talleres habilitados y operando dentro de 81cc.',
        suspendedTenants: 'Talleres pausados por moderacion o decision administrativa.',
        mrr: 'Ingreso mensual recurrente estimado por planes activos.',
        projectedArr: 'MRR anualizado para visualizar la proyeccion de ingresos.',
        processedVolume: 'Facturacion operativa total observada en los talleres.',
        arpa: 'Ingreso promedio mensual por taller activo.',
        takeRate: 'Relacion entre los ingresos de 81cc y el volumen procesado.',
        customPlans: 'Talleres que operan con condiciones comerciales personalizadas.',
      },
      expiringSummary,
      byPlan,
      tenants: tenants
        .map((tenant) => ({
          tenantId: tenant.id,
          tenantName: tenant.name,
          plan: tenant.effectivePlan,
          planLabel: tenant.customPlan?.name ?? tenant.effectivePlan,
          billingMode: tenant.customPlan ? 'custom' : 'catalog',
          status: tenant.status,
          users: tenant.totalUsers,
          activeOrders: tenant.activeOrders,
          mrrContribution: resolveMrr(tenant),
          workshopBillingVolume: tenant.monthlyRevenue,
          utilization:
            tenant.maxCapacity > 0 ? tenant.totalUsers / tenant.maxCapacity : 0,
        }))
        .sort((a, b) => b.mrrContribution - a.mrrContribution || b.workshopBillingVolume - a.workshopBillingVolume),
      charts: {
        byPlan: byPlan.map((plan, index) => ({
          name: plan.name,
          code: plan.code,
          tenants: plan.activeTenants,
          mrr: plan.mrr,
          color: ['#38bdf8', '#f59e0b', '#8b5cf6', '#10b981', '#f43f5e'][index % 5],
        })),
        byCycle: [
          { cycle: 'monthly' as const, name: 'Mensual', color: '#38bdf8' },
          { cycle: 'semiannual' as const, name: 'Semestral', color: '#8b5cf6' },
          { cycle: 'annual' as const, name: 'Anual', color: '#f59e0b' },
        ].map((item) => ({
          ...item,
          tenants: tenants.filter((tenant) => tenant.billingCycle === item.cycle).length,
        })),
        expiringBuckets: [
          { name: '30 dias', value: expiringSummary.dueIn30Days, color: '#facc15' },
          { name: '15 dias', value: expiringSummary.dueIn15Days, color: '#fb923c' },
          { name: '7 dias', value: expiringSummary.dueIn7Days, color: '#f43f5e' },
          { name: 'Vencidos', value: expiringSummary.expired, color: '#ef4444' },
        ],
      },
    };
  }

  async listUsersForSuperadmin(viewer: SessionUser) {
    this.assertSuperadmin(viewer);
    await this.ensureAdminTables();

    const users = await this.prisma.user.findMany({
      include: {
        tenant: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
    const sessions = await this.prisma.$queryRaw<
      Array<{ userId: string | null; lastSeenAt: Date }>
    >`
      SELECT "userId" as "userId", MAX("lastSeenAt") as "lastSeenAt"
      FROM "Session"
      WHERE "userId" IS NOT NULL
      GROUP BY "userId"
    `;
    const lastSeenMap = new Map(sessions.filter((row) => row.userId).map((row) => [row.userId!, row.lastSeenAt]));

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      lastSeenAt: lastSeenMap.get(user.id) ?? null,
      createdAt: user.createdAt,
    }));
  }

  async listTestAccountsForSuperadmin(viewer: SessionUser) {
    this.assertSuperadmin(viewer);

    return [];
  }

  async moderateTenant(
    viewer: SessionUser,
    tenantId: string,
    input: {
      status?: 'active' | 'suspended';
      planOverride?: string | null;
      moderationNote?: string | null;
      maxCapacity?: number;
      billingCycle?: BillingCycle;
      planStartAt?: string;
      planEndsAt?: string;
      nextRenewalAt?: string;
      autoRenew?: boolean;
      effectiveMonthlyPrice?: number | null;
      customPlan?: {
        enabled?: boolean;
        name?: string;
        monthlyPrice?: number;
        maxUsers?: number;
        maxWorkOrders?: number | null;
        features?: string[];
      } | null;
    },
  ) {
    this.assertSuperadmin(viewer);
    await this.ensureAdminTables();

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new UnauthorizedException('Taller no encontrado.');
    }
    const currentSettings = await this.getTenantAdminSettings(tenantId);

    if (typeof input.maxCapacity === 'number') {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { maxCapacity: input.maxCapacity },
      });
    }

    const billingCycle = this.normalizeBillingCycle(
      input.billingCycle ?? currentSettings?.billingCycle ?? 'monthly',
    );
    const planStartAt = this.parseDateInput(
      input.planStartAt,
      currentSettings?.planStartAt ?? tenant.createdAt,
    );
    const planEndsAt = this.resolvePlanEndDate(
      planStartAt,
      billingCycle,
      input.planEndsAt,
      currentSettings?.planEndsAt ?? null,
    );
    const nextRenewalAt = this.parseDateInput(
      input.nextRenewalAt,
      currentSettings?.nextRenewalAt ?? planEndsAt,
    );
    const autoRenew = input.autoRenew ?? currentSettings?.autoRenew ?? true;
    const effectiveMonthlyPrice =
      input.effectiveMonthlyPrice === null
        ? null
        : typeof input.effectiveMonthlyPrice === 'number'
          ? input.effectiveMonthlyPrice
          : currentSettings?.effectiveMonthlyPrice ?? null;

    const customPlanEnabled = input.customPlan?.enabled === true;
    const customPlanName = customPlanEnabled
      ? input.customPlan?.name?.trim() || `Plan custom ${tenant.name}`
      : null;
    const customMonthlyPrice = customPlanEnabled
      ? Number(input.customPlan?.monthlyPrice ?? 0)
      : null;
    const customMaxUsers = customPlanEnabled
      ? Number(input.customPlan?.maxUsers ?? input.maxCapacity ?? tenant.maxCapacity)
      : null;
    const customMaxWorkOrders = customPlanEnabled
      ? input.customPlan?.maxWorkOrders ?? null
      : null;
    const customFeatures = customPlanEnabled
      ? JSON.stringify(input.customPlan?.features ?? [])
      : null;

    await this.prisma.$executeRaw`
      INSERT INTO "TenantAdminSettings" (
        "tenantId",
        status,
        "planOverride",
        "moderationNote",
        "billingCycle",
        "planStartAt",
        "planEndsAt",
        "nextRenewalAt",
        "autoRenew",
        "effectiveMonthlyPrice",
        "customPlanEnabled",
        "customPlanName",
        "customMonthlyPrice",
        "customMaxUsers",
        "customMaxWorkOrders",
        "customFeatures",
        "updatedAt"
      )
      VALUES (
        ${tenantId},
        ${input.status ?? 'active'},
        ${input.planOverride ?? null},
        ${input.moderationNote ?? null},
        ${billingCycle},
        ${planStartAt},
        ${planEndsAt},
        ${nextRenewalAt},
        ${autoRenew},
        ${effectiveMonthlyPrice},
        ${customPlanEnabled},
        ${customPlanName},
        ${customMonthlyPrice},
        ${customMaxUsers},
        ${customMaxWorkOrders},
        ${customFeatures},
        NOW()
      )
      ON CONFLICT ("tenantId")
      DO UPDATE SET
        status = ${input.status ?? 'active'},
        "planOverride" = ${input.planOverride ?? null},
        "moderationNote" = ${input.moderationNote ?? null},
        "billingCycle" = ${billingCycle},
        "planStartAt" = ${planStartAt},
        "planEndsAt" = ${planEndsAt},
        "nextRenewalAt" = ${nextRenewalAt},
        "autoRenew" = ${autoRenew},
        "effectiveMonthlyPrice" = ${effectiveMonthlyPrice},
        "customPlanEnabled" = ${customPlanEnabled},
        "customPlanName" = ${customPlanName},
        "customMonthlyPrice" = ${customMonthlyPrice},
        "customMaxUsers" = ${customMaxUsers},
        "customMaxWorkOrders" = ${customMaxWorkOrders},
        "customFeatures" = ${customFeatures},
        "updatedAt" = NOW()
    `;

    return this.listTenantsForSuperadmin(viewer);
  }

  private async createSession(user: SessionUser, meta: RequestMeta) {
    const rawToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + this.sessionDurationMs);
    const sessionId = generateSessionToken();

    await this.prisma.$executeRaw`
      INSERT INTO "Session" (
        id,
        "tokenHash",
        "actorType",
        role,
        email,
        "userId",
        "clientId",
        "createdAt",
        "updatedAt",
        "lastSeenAt",
        "expiresAt",
        active,
        "userAgent",
        "ipAddress"
      )
      VALUES (
        ${sessionId},
        ${hashSessionToken(rawToken)},
        ${user.audience},
        ${user.role},
        ${user.email},
        ${user.audience === 'staff' ? user.id : null},
        ${user.audience === 'client' ? user.clientId ?? user.id : null},
        NOW(),
        NOW(),
        NOW(),
        ${expiresAt},
        true,
        ${meta.userAgent ?? null},
        ${meta.ipAddress ?? null}
      )
    `;

    return {
      token: rawToken,
      expiresAt: expiresAt.getTime(),
      user: {
        ...user,
        sessionId,
      },
    };
  }

  private async getOrCreateDefaultTenant() {
    const tenant = await this.prisma.tenant.findFirst();

    if (tenant) {
      return tenant;
    }

    return this.prisma.tenant.create({
      data: {
        name: 'Taller 2R',
        subscriptionPlan: 'starter',
      },
    });
  }

  private async findPortalClientsByEmail(email: string) {
    return this.prisma.$queryRaw<ClientPortalIdentity[]>`
      SELECT
        c.id,
        c."tenantId" as "tenantId",
        c.name,
        c.email,
        c.phone,
        cpa."passwordHash" as "passwordHash"
      FROM "Client" c
      LEFT JOIN "ClientPortalAccount" cpa ON cpa."clientId" = c.id
      WHERE LOWER(c.email) = LOWER(${email})
      ORDER BY c."createdAt" ASC
    `;
  }

  private async ensureAdminTables() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TenantAdminSettings" (
        "tenantId" TEXT PRIMARY KEY REFERENCES "Tenant"("id") ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'active',
        "planOverride" TEXT NULL,
        "moderationNote" TEXT NULL,
        "billingCycle" TEXT NULL,
        "planStartAt" TIMESTAMP(3) NULL,
        "planEndsAt" TIMESTAMP(3) NULL,
        "nextRenewalAt" TIMESTAMP(3) NULL,
        "autoRenew" BOOLEAN NOT NULL DEFAULT TRUE,
        "effectiveMonthlyPrice" DOUBLE PRECISION NULL,
        "customPlanEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
        "customPlanName" TEXT NULL,
        "customMonthlyPrice" DOUBLE PRECISION NULL,
        "customMaxUsers" INTEGER NULL,
        "customMaxWorkOrders" INTEGER NULL,
        "customFeatures" TEXT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT NULL;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "planStartAt" TIMESTAMP(3) NULL;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "planEndsAt" TIMESTAMP(3) NULL;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "nextRenewalAt" TIMESTAMP(3) NULL;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "effectiveMonthlyPrice" DOUBLE PRECISION NULL;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "customPlanEnabled" BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "customPlanName" TEXT NULL;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "customMonthlyPrice" DOUBLE PRECISION NULL;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "customMaxUsers" INTEGER NULL;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "customMaxWorkOrders" INTEGER NULL;
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "TenantAdminSettings" ADD COLUMN IF NOT EXISTS "customFeatures" TEXT NULL;
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PlatformPlan" (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        "monthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "maxUsers" INTEGER NOT NULL DEFAULT 1,
        "maxWorkOrders" INTEGER NULL,
        features TEXT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await this.prisma.$executeRaw`
      INSERT INTO "PlatformPlan" (id, code, name, "monthlyPrice", "maxUsers", "maxWorkOrders", features, active, "createdAt", "updatedAt")
      VALUES
        ('plan-starter', 'starter', 'Starter', 29, 4, 30, ${JSON.stringify(['Turnos', 'Clientes', 'Portal cliente'])}, true, NOW(), NOW()),
        ('plan-pro', 'pro', 'Pro', 79, 12, 120, ${JSON.stringify(['Turnos', 'Órdenes', 'Finanzas', 'Portal cliente', 'Equipo'])}, true, NOW(), NOW()),
        ('plan-enterprise', 'enterprise', 'Enterprise', 149, 40, NULL, ${JSON.stringify(['Multi sucursal', 'Soporte prioritario', 'Automatizaciones', 'Auditoría'])}, true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `;
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PlanChangeRequest" (
        id TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
        "requestedByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "requestedPlanCode" TEXT NOT NULL,
        "requestedBillingCycle" TEXT NOT NULL DEFAULT 'monthly',
        status TEXT NOT NULL DEFAULT 'pending',
        "requestNote" TEXT NULL,
        "reviewNote" TEXT NULL,
        "reviewedByUserId" TEXT NULL REFERENCES "User"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reviewedAt" TIMESTAMP(3) NULL
      );
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PlanChangeRequest_tenantId_idx" ON "PlanChangeRequest"("tenantId");
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PlanChangeRequest_status_idx" ON "PlanChangeRequest"(status);
    `);
  }

  private assertSuperadmin(viewer: SessionUser) {
    if (viewer.audience !== 'staff' || viewer.role !== 'superadmin') {
      throw new ForbiddenException('Solo 81cc superadmin puede acceder.');
    }
  }

  private async getTenantAdminSettings(tenantId: string) {
    await this.ensureAdminTables();
    const [settings] = await this.prisma.$queryRaw<TenantAdminSettingsRow[]>`
      SELECT
        "tenantId" as "tenantId",
        status,
        "planOverride" as "planOverride",
        "moderationNote" as "moderationNote",
        "billingCycle" as "billingCycle",
        "planStartAt" as "planStartAt",
        "planEndsAt" as "planEndsAt",
        "nextRenewalAt" as "nextRenewalAt",
        "autoRenew" as "autoRenew",
        "effectiveMonthlyPrice" as "effectiveMonthlyPrice",
        "customPlanEnabled" as "customPlanEnabled",
        "customPlanName" as "customPlanName",
        "customMonthlyPrice" as "customMonthlyPrice",
        "customMaxUsers" as "customMaxUsers",
        "customMaxWorkOrders" as "customMaxWorkOrders",
        "customFeatures" as "customFeatures",
        "updatedAt" as "updatedAt"
      FROM "TenantAdminSettings"
      WHERE "tenantId" = ${tenantId}
      LIMIT 1
    `;

    return settings ?? null;
  }

  private normalizeBillingCycle(value: string | null | undefined): BillingCycle {
    if (value === 'semiannual' || value === 'annual') {
      return value;
    }
    return 'monthly';
  }

  private async listBasicCatalogPlans() {
    await this.ensureAdminTables();
    return this.prisma.$queryRaw<PlatformPlanRow[]>`
      SELECT
        id,
        code,
        name,
        "monthlyPrice" as "monthlyPrice",
        "maxUsers" as "maxUsers",
        "maxWorkOrders" as "maxWorkOrders",
        features,
        active,
        "createdAt" as "createdAt",
        "updatedAt" as "updatedAt"
      FROM "PlatformPlan"
      WHERE code IN ('starter', 'pro', 'enterprise')
      ORDER BY "monthlyPrice" ASC
    `;
  }

  private async applyApprovedCatalogPlan(
    tenantId: string,
    planCode: string,
    billingCycle: BillingCycle,
  ) {
    const plans = await this.listBasicCatalogPlans();
    const selectedPlan = plans.find((plan) => plan.code === planCode && plan.active);
    if (!selectedPlan) {
      throw new UnauthorizedException('El plan solicitado no está disponible.');
    }

    const startAt = new Date();
    const endsAt = this.resolvePlanEndDate(startAt, billingCycle);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: selectedPlan.code,
        maxCapacity: selectedPlan.maxUsers,
      },
    });

    await this.prisma.$executeRaw`
      INSERT INTO "TenantAdminSettings" (
        "tenantId",
        status,
        "planOverride",
        "moderationNote",
        "billingCycle",
        "planStartAt",
        "planEndsAt",
        "nextRenewalAt",
        "autoRenew",
        "effectiveMonthlyPrice",
        "customPlanEnabled",
        "customPlanName",
        "customMonthlyPrice",
        "customMaxUsers",
        "customMaxWorkOrders",
        "customFeatures",
        "updatedAt"
      )
      VALUES (
        ${tenantId},
        'active',
        NULL,
        NULL,
        ${billingCycle},
        ${startAt},
        ${endsAt},
        ${endsAt},
        true,
        ${selectedPlan.monthlyPrice},
        false,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NOW()
      )
      ON CONFLICT ("tenantId")
      DO UPDATE SET
        status = 'active',
        "planOverride" = NULL,
        "moderationNote" = NULL,
        "billingCycle" = ${billingCycle},
        "planStartAt" = ${startAt},
        "planEndsAt" = ${endsAt},
        "nextRenewalAt" = ${endsAt},
        "autoRenew" = true,
        "effectiveMonthlyPrice" = ${selectedPlan.monthlyPrice},
        "customPlanEnabled" = false,
        "customPlanName" = NULL,
        "customMonthlyPrice" = NULL,
        "customMaxUsers" = NULL,
        "customMaxWorkOrders" = NULL,
        "customFeatures" = NULL,
        "updatedAt" = NOW()
    `;
  }

  private async resolveTenantAccess(tenantId: string): Promise<TenantAccessState> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, createdAt: true, subscriptionPlan: true },
    });
    if (!tenant) {
      return {
        restricted: true,
        trialEndsAt: null,
        trialRemainingDays: null,
      };
    }
    const settings = await this.getTenantAdminSettings(tenant.id);
    const effectivePlan = settings?.planOverride ?? tenant.subscriptionPlan;
    const hasCustomPlan = settings?.customPlanEnabled === true;
    const hasPaidPlan = hasCustomPlan || (effectivePlan && effectivePlan !== 'free');

    if (hasPaidPlan) {
      return {
        restricted: false,
        trialEndsAt: null,
        trialRemainingDays: null,
      };
    }

    const trialEndsAt = new Date(tenant.createdAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 3);
    const trialRemainingDays = Math.ceil(
      (trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    return {
      restricted: trialRemainingDays < 0,
      trialEndsAt,
      trialRemainingDays,
    };
  }

  private parseDateInput(value: string | undefined, fallback: Date | null) {
    if (typeof value === 'string' && value.trim()) {
      return new Date(value);
    }
    return fallback ? new Date(fallback) : new Date();
  }

  private resolvePlanEndDate(
    startAt: Date,
    cycle: BillingCycle,
    explicitEndAt?: string,
    fallback?: Date | null,
  ) {
    if (explicitEndAt?.trim()) {
      return new Date(explicitEndAt);
    }
    if (fallback) {
      return new Date(fallback);
    }
    const date = new Date(startAt);
    if (cycle === 'annual') {
      date.setMonth(date.getMonth() + 12);
      return date;
    }
    if (cycle === 'semiannual') {
      date.setMonth(date.getMonth() + 6);
      return date;
    }
    date.setMonth(date.getMonth() + 1);
    return date;
  }

  private resolveWarningLevel(remainingDays: number): WarningLevel {
    if (remainingDays < 0) {
      return 'expired';
    }
    if (remainingDays <= 7) {
      return '7d';
    }
    if (remainingDays <= 15) {
      return '15d';
    }
    if (remainingDays <= 30) {
      return '30d';
    }
    return 'normal';
  }

  private resolveTenantContract(
    tenant: { createdAt: Date },
    settings?: TenantAdminSettingsRow,
  ) {
    const billingCycle = this.normalizeBillingCycle(settings?.billingCycle);
    const planStartAt = settings?.planStartAt
      ? new Date(settings.planStartAt)
      : new Date(tenant.createdAt);
    const planEndsAt = settings?.planEndsAt
      ? new Date(settings.planEndsAt)
      : this.resolvePlanEndDate(planStartAt, billingCycle);
    const nextRenewalAt = settings?.nextRenewalAt
      ? new Date(settings.nextRenewalAt)
      : new Date(planEndsAt);
    const remainingDays = Math.ceil(
      (nextRenewalAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const warningLevel = this.resolveWarningLevel(remainingDays);
    let contractStatus: ContractStatus = 'active';

    if ((settings?.status ?? 'active') === 'suspended') {
      contractStatus = 'suspended';
    } else if (warningLevel === 'expired') {
      contractStatus = 'expired';
    } else if (warningLevel !== 'normal') {
      contractStatus = 'expiring';
    }

    return {
      billingCycle,
      planStartAt,
      planEndsAt,
      nextRenewalAt,
      autoRenew: settings?.autoRenew ?? true,
      remainingDays,
      warningLevel,
      contractStatus,
    };
  }

  private async getTenantStatusMap(tenantIds: string[]) {
    if (!tenantIds.length) {
      return new Map<string, string>();
    }
    await this.ensureAdminTables();
    const rows = await this.prisma.$queryRawUnsafe<TenantAdminSettingsRow[]>(
      `SELECT
         "tenantId" as "tenantId",
         status,
         "planOverride" as "planOverride",
         "moderationNote" as "moderationNote",
         "billingCycle" as "billingCycle",
         "planStartAt" as "planStartAt",
         "planEndsAt" as "planEndsAt",
         "nextRenewalAt" as "nextRenewalAt",
         "autoRenew" as "autoRenew",
         "effectiveMonthlyPrice" as "effectiveMonthlyPrice",
         "customPlanEnabled" as "customPlanEnabled",
         "customPlanName" as "customPlanName",
         "customMonthlyPrice" as "customMonthlyPrice",
         "customMaxUsers" as "customMaxUsers",
         "customMaxWorkOrders" as "customMaxWorkOrders",
         "customFeatures" as "customFeatures",
         "updatedAt" as "updatedAt"
       FROM "TenantAdminSettings"
       WHERE "tenantId" IN (${tenantIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(', ')})`,
    );
    return new Map(rows.map((row) => [row.tenantId, row.status]));
  }

  private async getTenantStatus(tenantId: string) {
    const map = await this.getTenantStatusMap([tenantId]);
    return map.get(tenantId) ?? 'active';
  }

  private initialsFromName(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const users = await this.prisma.user.findMany({
      where: { email: normalizedEmail },
    });

    if (users.length === 0) {
      return { ok: true };
    }

    const rawToken = generateSessionToken();

    await Promise.all(
      users.map((u) =>
        this.prisma.user.update({
          where: { id: u.id },
          data: {
            resetPasswordToken: rawToken,
            resetPasswordExpires: new Date(Date.now() + 1000 * 60 * 60),
          },
        }),
      ),
    );

    console.log(`\n[PASSWORD RESET] Recuperación de contraseña para ${email}\n[PASSWORD RESET] Enlace: /reset-password?token=${rawToken}\n`);

    return { ok: true, devToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined };
  }

  async resetPassword(token: string, newPassword: string) {
    const users = await this.prisma.user.findMany({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gte: new Date() },
      },
    });

    if (users.length === 0) {
      throw new UnauthorizedException('El enlace expiró o es inválido.');
    }

    const passwordHash = hashPassword(newPassword);

    await Promise.all(
      users.map((u) =>
        this.prisma.user.update({
          where: { id: u.id },
          data: {
            passwordHash,
            resetPasswordToken: null,
            resetPasswordExpires: null,
          },
        }),
      ),
    );

    return { ok: true };
  }
}
