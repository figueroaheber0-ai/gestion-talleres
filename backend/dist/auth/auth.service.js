"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const password_util_1 = require("./password.util");
const demo_users_1 = require("./demo-users");
let AuthService = class AuthService {
    prisma;
    sessionDurationMs = 1000 * 60 * 60 * 24 * 7;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async loginWithCredentials(email, password, meta, tenantId) {
        const normalizedEmail = email.toLowerCase().trim();
        const users = await this.prisma.user.findMany({
            where: { email: normalizedEmail },
            include: {
                tenant: true,
            },
        });
        const matchingUsers = users.filter((candidate) => (0, password_util_1.verifyPassword)(password, candidate.passwordHash));
        const tenantStatuses = await this.getTenantStatusMap(matchingUsers.map((candidate) => candidate.tenantId));
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
                throw new common_1.UnauthorizedException('Este taller fue suspendido temporalmente por 81cc.');
            }
            return this.createSession({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: this.initialsFromName(user.name),
                audience: 'staff',
                tenantId: user.tenantId,
            }, meta);
        }
        const demoEntry = Object.values(demo_users_1.DEMO_USERS).find((entry) => entry.user.email.toLowerCase() === normalizedEmail &&
            entry.password === password);
        if (demoEntry) {
            return this.createEphemeralSession({
                id: demoEntry.user.email,
                name: demoEntry.user.name,
                email: demoEntry.user.email,
                role: demoEntry.user.role,
                avatar: demoEntry.user.avatar,
                audience: 'staff',
            });
        }
        throw new common_1.UnauthorizedException('Email o contrasena invalidos.');
    }
    async loginDemo(role, meta) {
        const entry = demo_users_1.DEMO_USERS[role];
        if (!entry) {
            throw new common_1.UnauthorizedException('Rol demo invalido.');
        }
        try {
            return await this.loginWithCredentials(entry.user.email, entry.password, meta);
        }
        catch {
            return this.createEphemeralSession({
                id: entry.user.email,
                name: entry.user.name,
                email: entry.user.email,
                role: entry.user.role,
                avatar: entry.user.avatar,
                audience: 'staff',
            });
        }
    }
    async registerOwner(input) {
        const email = input.email.toLowerCase().trim();
        const existingUser = await this.prisma.user.findFirst({
            where: { email },
        });
        if (existingUser) {
            throw new common_1.UnauthorizedException('Ese email ya esta en uso.');
        }
        const tenant = await this.prisma.tenant.create({
            data: {
                name: input.workshopName,
                subscriptionPlan: 'starter',
                maxCapacity: 8,
            },
        });
        const user = await this.prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: input.name,
                email,
                role: 'owner',
                passwordHash: (0, password_util_1.hashPassword)(input.password),
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
    async registerClient(input) {
        const tenant = await this.getOrCreateDefaultTenant();
        const email = input.email.toLowerCase().trim();
        const normalizedPlate = input.plate.replace(/\s+/g, '').toUpperCase();
        const passwordHash = (0, password_util_1.hashPassword)(input.password);
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
        }
        else if (client.name !== input.name || client.phone !== input.phone) {
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
        const clientsToSync = [...knownClients.filter((candidate) => candidate.id !== client.id), client];
        await Promise.all(clientsToSync.map((candidate) => this.prisma.$executeRaw `
          INSERT INTO "ClientPortalAccount" ("id", "clientId", "passwordHash", "createdAt", "updatedAt")
          VALUES (${(0, password_util_1.generateSessionToken)()}, ${candidate.id}, ${passwordHash}, NOW(), NOW())
          ON CONFLICT ("clientId")
          DO UPDATE SET
            "passwordHash" = ${passwordHash},
            "updatedAt" = NOW()
        `));
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
    async loginClient(email, password, meta) {
        const identities = await this.findPortalClientsByEmail(email.toLowerCase().trim());
        const account = identities.find((candidate) => candidate.passwordHash && (0, password_util_1.verifyPassword)(password, candidate.passwordHash));
        if (!account) {
            throw new common_1.UnauthorizedException('Credenciales del cliente invalidas.');
        }
        return this.createSession({
            id: account.id,
            name: account.name,
            email: account.email ?? email,
            role: 'client',
            avatar: this.initialsFromName(account.name),
            audience: 'client',
            tenantId: account.tenantId,
            clientId: account.id,
        }, meta);
    }
    async readSession(token) {
        if (token.startsWith('demo-')) {
            throw new common_1.UnauthorizedException('Las sesiones demo no son persistentes.');
        }
        const [session] = await this.prisma.$queryRaw `
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
      WHERE "tokenHash" = ${(0, password_util_1.hashSessionToken)(token)}
      LIMIT 1
    `;
        if (!session || !session.active || new Date(session.expiresAt).getTime() <= Date.now()) {
            throw new common_1.UnauthorizedException('La sesion expiro o no existe.');
        }
        await this.prisma.$executeRaw `
      UPDATE "Session"
      SET "lastSeenAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${session.id}
    `;
        if (session.actorType === 'staff' && session.userId) {
            const user = await this.prisma.user.findUnique({
                where: { id: session.userId },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('Sesion invalida.');
            }
            if (user.role !== 'superadmin') {
                const tenantStatus = await this.getTenantStatus(user.tenantId);
                if (tenantStatus === 'suspended') {
                    throw new common_1.UnauthorizedException('Este taller fue suspendido temporalmente por 81cc.');
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
                throw new common_1.UnauthorizedException('Sesion invalida.');
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
        throw new common_1.UnauthorizedException('Sesion invalida.');
    }
    async requireSession(authorization, audience) {
        const token = authorization?.replace(/^Bearer\s+/i, '').trim();
        if (!token) {
            throw new common_1.UnauthorizedException('Falta el token de sesion.');
        }
        const user = await this.readSession(token);
        if (audience && user.audience !== audience) {
            throw new common_1.UnauthorizedException('No tienes permisos para esta vista.');
        }
        return user;
    }
    async listSessions(viewer) {
        if (viewer.audience !== 'staff' || !viewer.tenantId) {
            throw new common_1.UnauthorizedException('No autorizado.');
        }
        return this.prisma.$queryRaw `
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
    async listStaff(viewer) {
        if (viewer.audience !== 'staff' || !viewer.tenantId || viewer.role !== 'owner') {
            throw new common_1.ForbiddenException('Solo el dueno puede administrar el equipo.');
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
    async listStaffInvites(viewer) {
        if (viewer.audience !== 'staff' || !viewer.tenantId || viewer.role !== 'owner') {
            throw new common_1.ForbiddenException('Solo el dueno puede administrar invitaciones.');
        }
        return this.prisma.$queryRaw `
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
    async createStaffInvite(viewer, input) {
        if (viewer.audience !== 'staff' || !viewer.tenantId || viewer.role !== 'owner') {
            throw new common_1.ForbiddenException('Solo el dueno puede invitar mecanicos.');
        }
        const normalizedEmail = input.email.toLowerCase().trim();
        if (!['employee', 'superadmin'].includes(input.role)) {
            throw new common_1.UnauthorizedException('Solo puedes invitar perfiles operativos o de soporte.');
        }
        const existing = await this.prisma.user.findFirst({
            where: {
                tenantId: viewer.tenantId,
                email: normalizedEmail,
            },
        });
        if (existing) {
            throw new common_1.UnauthorizedException('Ese email ya pertenece al equipo del taller.');
        }
        const rawToken = (0, password_util_1.generateSessionToken)();
        const inviteId = (0, password_util_1.generateSessionToken)();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
        await this.prisma.$executeRaw `
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
        ${(0, password_util_1.hashSessionToken)(rawToken)},
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
    async readStaffInvite(token) {
        const [invite] = await this.prisma.$queryRaw `
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
      WHERE si."tokenHash" = ${(0, password_util_1.hashSessionToken)(token)}
      LIMIT 1
    `;
        if (!invite || invite.status !== 'pending' || new Date(invite.expiresAt).getTime() <= Date.now()) {
            throw new common_1.UnauthorizedException('La invitacion es invalida o expiro.');
        }
        return invite;
    }
    async acceptStaffInvite(input) {
        const invite = await this.readStaffInvite(input.token);
        const existing = await this.prisma.user.findFirst({
            where: {
                tenantId: invite.tenantId,
                email: invite.email,
            },
        });
        if (existing) {
            throw new common_1.UnauthorizedException('La invitacion ya fue utilizada.');
        }
        const user = await this.prisma.user.create({
            data: {
                tenantId: invite.tenantId,
                name: invite.name,
                email: invite.email,
                role: invite.role,
                passwordHash: (0, password_util_1.hashPassword)(input.password),
            },
        });
        await this.prisma.$executeRaw `
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
    async listTenantsForSuperadmin(viewer) {
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
        const settings = await this.prisma.$queryRaw `
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
        const planRows = await this.prisma.$queryRaw `
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
            const effectivePlanCode = tenantSettings?.planOverride ?? tenant.subscriptionPlan;
            const customPlan = tenantSettings?.customPlanEnabled &&
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
                effectiveMonthlyPrice: tenantSettings?.effectiveMonthlyPrice ??
                    customPlan?.monthlyPrice ??
                    priceMap.get(effectivePlanCode) ??
                    0,
                owner: tenant.users.find((user) => user.role === 'owner')?.name ??
                    tenant.users[0]?.name ??
                    'Sin dueno',
                ownerEmail: tenant.users.find((user) => user.role === 'owner')?.email ??
                    tenant.users[0]?.email ??
                    '',
                employees: tenant.users.filter((user) => user.role === 'employee').length,
                totalUsers: tenant.users.length,
                activeOrders: tenant.workOrders.filter((order) => ['pending', 'estimating', 'waiting_parts', 'repairing'].includes(order.status)).length,
                monthlyRevenue: tenant.workOrders.reduce((sum, order) => sum + order.totalCost, 0),
            };
        });
    }
    async listPlansForSuperadmin(viewer) {
        this.assertSuperadmin(viewer);
        await this.ensureAdminTables();
        const plans = await this.prisma.$queryRaw `
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
    async upsertPlanForSuperadmin(viewer, input) {
        this.assertSuperadmin(viewer);
        await this.ensureAdminTables();
        const code = input.code.trim().toLowerCase();
        const name = input.name.trim();
        const planId = `plan-${code}`;
        if (!code || !name) {
            throw new common_1.UnauthorizedException('El plan debe tener codigo y nombre.');
        }
        await this.prisma.$executeRaw `
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
    async getPlatformFinanceSummary(viewer) {
        this.assertSuperadmin(viewer);
        await this.ensureAdminTables();
        const [plans, tenants] = await Promise.all([
            this.listPlansForSuperadmin(viewer),
            this.listTenantsForSuperadmin(viewer),
        ]);
        const priceMap = new Map(plans.map((plan) => [plan.code, plan.monthlyPrice]));
        const resolveMrr = (tenant) => tenant.customPlan?.monthlyPrice ?? priceMap.get(tenant.effectivePlan) ?? 0;
        const activeTenants = tenants.filter((tenant) => tenant.status === 'active');
        const suspendedTenants = tenants.filter((tenant) => tenant.status === 'suspended');
        const mrr = activeTenants.reduce((sum, tenant) => sum + resolveMrr(tenant), 0);
        const projectedArr = mrr * 12;
        const processedVolume = tenants.reduce((sum, tenant) => sum + tenant.monthlyRevenue, 0);
        const arpa = activeTenants.length ? mrr / activeTenants.length : 0;
        const takeRate = processedVolume ? (mrr / processedVolume) * 100 : 0;
        const customPlans = activeTenants.filter((tenant) => tenant.customPlan).length;
        const expiringTenants = tenants.filter((tenant) => tenant.contractStatus === 'expiring' || tenant.contractStatus === 'expired');
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
                utilization: tenant.maxCapacity > 0 ? tenant.totalUsers / tenant.maxCapacity : 0,
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
                    { cycle: 'monthly', name: 'Mensual', color: '#38bdf8' },
                    { cycle: 'semiannual', name: 'Semestral', color: '#8b5cf6' },
                    { cycle: 'annual', name: 'Anual', color: '#f59e0b' },
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
    async listUsersForSuperadmin(viewer) {
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
        const sessions = await this.prisma.$queryRaw `
      SELECT "userId" as "userId", MAX("lastSeenAt") as "lastSeenAt"
      FROM "Session"
      WHERE "userId" IS NOT NULL
      GROUP BY "userId"
    `;
        const lastSeenMap = new Map(sessions.filter((row) => row.userId).map((row) => [row.userId, row.lastSeenAt]));
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
    async listTestAccountsForSuperadmin(viewer) {
        this.assertSuperadmin(viewer);
        return [
            ...Object.values(demo_users_1.DEMO_USERS).map((entry) => ({
                role: entry.user.role,
                name: entry.user.name,
                email: entry.user.email,
                password: entry.password,
                scope: entry.user.role === 'superadmin'
                    ? 'Administracion de plataforma'
                    : 'Operacion interna del taller',
                notes: entry.user.role === 'owner'
                    ? 'Cuenta de prueba para revisar gestion del taller.'
                    : entry.user.role === 'employee'
                        ? 'Cuenta de prueba para revisar operacion diaria.'
                        : 'Cuenta de prueba para moderacion y laboratorio.',
            })),
            {
                role: 'client',
                name: 'Juan Cliente',
                email: 'juan@cliente.com',
                password: 'cliente123',
                scope: 'Portal de clientes',
                notes: 'Cuenta de prueba para historial del vehiculo y actualizaciones.',
            },
        ];
    }
    async moderateTenant(viewer, tenantId, input) {
        this.assertSuperadmin(viewer);
        await this.ensureAdminTables();
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            throw new common_1.UnauthorizedException('Taller no encontrado.');
        }
        const currentSettings = await this.getTenantAdminSettings(tenantId);
        if (typeof input.maxCapacity === 'number') {
            await this.prisma.tenant.update({
                where: { id: tenantId },
                data: { maxCapacity: input.maxCapacity },
            });
        }
        const billingCycle = this.normalizeBillingCycle(input.billingCycle ?? currentSettings?.billingCycle ?? 'monthly');
        const planStartAt = this.parseDateInput(input.planStartAt, currentSettings?.planStartAt ?? tenant.createdAt);
        const planEndsAt = this.resolvePlanEndDate(planStartAt, billingCycle, input.planEndsAt, currentSettings?.planEndsAt ?? null);
        const nextRenewalAt = this.parseDateInput(input.nextRenewalAt, currentSettings?.nextRenewalAt ?? planEndsAt);
        const autoRenew = input.autoRenew ?? currentSettings?.autoRenew ?? true;
        const effectiveMonthlyPrice = input.effectiveMonthlyPrice === null
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
        await this.prisma.$executeRaw `
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
    async createSession(user, meta) {
        const rawToken = (0, password_util_1.generateSessionToken)();
        const expiresAt = new Date(Date.now() + this.sessionDurationMs);
        const sessionId = (0, password_util_1.generateSessionToken)();
        await this.prisma.$executeRaw `
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
        ${(0, password_util_1.hashSessionToken)(rawToken)},
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
    createEphemeralSession(user) {
        return {
            token: `demo-${(0, password_util_1.generateSessionToken)()}`,
            expiresAt: Date.now() + this.sessionDurationMs,
            user,
        };
    }
    async getOrCreateDefaultTenant() {
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
    async findPortalClientsByEmail(email) {
        return this.prisma.$queryRaw `
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
    async ensureAdminTables() {
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
        await this.prisma.$executeRaw `
      INSERT INTO "PlatformPlan" (id, code, name, "monthlyPrice", "maxUsers", "maxWorkOrders", features, active, "createdAt", "updatedAt")
      VALUES
        ('plan-starter', 'starter', 'Starter', 29, 4, 30, ${JSON.stringify(['Turnos', 'Clientes', 'Portal cliente'])}, true, NOW(), NOW()),
        ('plan-pro', 'pro', 'Pro', 79, 12, 120, ${JSON.stringify(['Turnos', 'Órdenes', 'Finanzas', 'Portal cliente', 'Equipo'])}, true, NOW(), NOW()),
        ('plan-enterprise', 'enterprise', 'Enterprise', 149, 40, NULL, ${JSON.stringify(['Multi sucursal', 'Soporte prioritario', 'Automatizaciones', 'Auditoría'])}, true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `;
    }
    assertSuperadmin(viewer) {
        if (viewer.audience !== 'staff' || viewer.role !== 'superadmin') {
            throw new common_1.ForbiddenException('Solo 81cc superadmin puede acceder.');
        }
    }
    async getTenantAdminSettings(tenantId) {
        await this.ensureAdminTables();
        const [settings] = await this.prisma.$queryRaw `
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
    normalizeBillingCycle(value) {
        if (value === 'semiannual' || value === 'annual') {
            return value;
        }
        return 'monthly';
    }
    parseDateInput(value, fallback) {
        if (typeof value === 'string' && value.trim()) {
            return new Date(value);
        }
        return fallback ? new Date(fallback) : new Date();
    }
    resolvePlanEndDate(startAt, cycle, explicitEndAt, fallback) {
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
    resolveWarningLevel(remainingDays) {
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
    resolveTenantContract(tenant, settings) {
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
        const remainingDays = Math.ceil((nextRenewalAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const warningLevel = this.resolveWarningLevel(remainingDays);
        let contractStatus = 'active';
        if ((settings?.status ?? 'active') === 'suspended') {
            contractStatus = 'suspended';
        }
        else if (warningLevel === 'expired') {
            contractStatus = 'expired';
        }
        else if (warningLevel !== 'normal') {
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
    async getTenantStatusMap(tenantIds) {
        if (!tenantIds.length) {
            return new Map();
        }
        await this.ensureAdminTables();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT
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
       WHERE "tenantId" IN (${tenantIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(', ')})`);
        return new Map(rows.map((row) => [row.tenantId, row.status]));
    }
    async getTenantStatus(tenantId) {
        const map = await this.getTenantStatusMap([tenantId]);
        return map.get(tenantId) ?? 'active';
    }
    initialsFromName(name) {
        return name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map