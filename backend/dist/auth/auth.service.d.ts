import { PrismaService } from '../prisma/prisma.service';
import { SessionAudience, SessionUser, StaffRole } from './auth.types';
interface RequestMeta {
    userAgent?: string;
    ipAddress?: string;
}
type BillingCycle = 'monthly' | 'semiannual' | 'annual';
type ContractStatus = 'active' | 'expiring' | 'expired' | 'suspended';
type WarningLevel = 'normal' | '30d' | '15d' | '7d' | 'expired';
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
export declare class AuthService {
    private readonly prisma;
    private readonly sessionDurationMs;
    constructor(prisma: PrismaService);
    loginWithCredentials(email: string, password: string, meta: RequestMeta, tenantId?: string): Promise<{
        token: string;
        expiresAt: number;
        user: SessionUser;
    } | {
        requiresTenantSelection: boolean;
        accounts: {
            tenantId: string;
            tenantName: string;
            role: string;
            name: string;
            email: string;
        }[];
    }>;
    loginDemo(role: StaffRole, meta: RequestMeta): Promise<{
        token: string;
        expiresAt: number;
        user: SessionUser;
    } | {
        requiresTenantSelection: boolean;
        accounts: {
            tenantId: string;
            tenantName: string;
            role: string;
            name: string;
            email: string;
        }[];
    }>;
    registerOwner(input: {
        workshopName: string;
        name: string;
        email: string;
        password: string;
    }): Promise<{
        tenantId: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
    }>;
    registerClient(input: {
        name: string;
        email: string;
        phone?: string;
        password: string;
        plate: string;
        brand: string;
        model: string;
        year?: number;
    }): Promise<{
        ok: boolean;
    }>;
    loginClient(email: string, password: string, meta: RequestMeta): Promise<{
        token: string;
        expiresAt: number;
        user: {
            sessionId: string;
            id: string;
            name: string;
            email: string;
            role: string;
            avatar: string;
            audience: SessionAudience;
            tenantId?: string;
            clientId?: string;
        };
    }>;
    readSession(token: string): Promise<SessionUser>;
    requireSession(authorization: string | undefined, audience?: SessionAudience): Promise<SessionUser>;
    listSessions(viewer: SessionUser): Promise<{
        id: string;
        actorType: string;
        role: string;
        email: string;
        createdAt: Date;
        lastSeenAt: Date;
        active: boolean;
    }[]>;
    listStaff(viewer: SessionUser): Promise<{
        id: string;
        name: string;
        email: string;
        role: string;
        createdAt: Date;
    }[]>;
    listStaffInvites(viewer: SessionUser): Promise<StaffInviteRow[]>;
    createStaffInvite(viewer: SessionUser, input: {
        name: string;
        email: string;
        role: StaffRole;
    }): Promise<{
        ok: boolean;
        inviteToken: string;
        expiresAt: number;
    }>;
    readStaffInvite(token: string): Promise<StaffInviteRow & {
        tokenHash: string;
    }>;
    acceptStaffInvite(input: {
        token: string;
        password: string;
    }): Promise<{
        ok: boolean;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
        tenantName: string;
    }>;
    listTenantsForSuperadmin(viewer: SessionUser): Promise<{
        id: string;
        name: string;
        plan: string;
        effectivePlan: string;
        effectivePlanLabel: string;
        billingMode: string;
        customPlan: {
            enabled: boolean;
            name: string;
            monthlyPrice: number;
            maxUsers: number;
            maxWorkOrders: number | null;
            features: any;
        } | null;
        status: string;
        contractStatus: ContractStatus;
        warningLevel: WarningLevel;
        moderationNote: string | null;
        maxCapacity: number;
        createdAt: Date;
        billingCycle: BillingCycle;
        planStartAt: Date;
        planEndsAt: Date;
        nextRenewalAt: Date;
        autoRenew: boolean;
        remainingDays: number;
        effectiveMonthlyPrice: number;
        owner: string;
        ownerEmail: string;
        employees: number;
        totalUsers: number;
        activeOrders: number;
        monthlyRevenue: number;
    }[]>;
    listPlansForSuperadmin(viewer: SessionUser): Promise<{
        features: any;
        id: string;
        code: string;
        name: string;
        monthlyPrice: number;
        maxUsers: number;
        maxWorkOrders: number | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    upsertPlanForSuperadmin(viewer: SessionUser, input: {
        code: string;
        name: string;
        monthlyPrice: number;
        maxUsers: number;
        maxWorkOrders?: number | null;
        features?: string[];
        active?: boolean;
    }): Promise<{
        features: any;
        id: string;
        code: string;
        name: string;
        monthlyPrice: number;
        maxUsers: number;
        maxWorkOrders: number | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getPlatformFinanceSummary(viewer: SessionUser): Promise<{
        headline: {
            activeTenants: number;
            suspendedTenants: number;
            mrr: number;
            projectedArr: number;
            processedVolume: number;
            arpa: number;
            takeRate: number;
            customPlans: number;
        };
        descriptions: {
            activeTenants: string;
            suspendedTenants: string;
            mrr: string;
            projectedArr: string;
            processedVolume: string;
            arpa: string;
            takeRate: string;
            customPlans: string;
        };
        expiringSummary: {
            dueIn30Days: number;
            dueIn15Days: number;
            dueIn7Days: number;
            expired: number;
            atRiskMrr: number;
        };
        byPlan: {
            code: string;
            name: string;
            monthlyPrice: number;
            tenants: number;
            activeTenants: number;
            mrr: number;
        }[];
        tenants: {
            tenantId: string;
            tenantName: string;
            plan: string;
            planLabel: string;
            billingMode: string;
            status: string;
            users: number;
            activeOrders: number;
            mrrContribution: number;
            workshopBillingVolume: number;
            utilization: number;
        }[];
        charts: {
            byPlan: {
                name: string;
                code: string;
                tenants: number;
                mrr: number;
                color: string;
            }[];
            byCycle: ({
                tenants: number;
                cycle: "monthly";
                name: string;
                color: string;
            } | {
                tenants: number;
                cycle: "semiannual";
                name: string;
                color: string;
            } | {
                tenants: number;
                cycle: "annual";
                name: string;
                color: string;
            })[];
            expiringBuckets: {
                name: string;
                value: number;
                color: string;
            }[];
        };
    }>;
    listUsersForSuperadmin(viewer: SessionUser): Promise<{
        id: string;
        name: string;
        email: string;
        role: string;
        tenantId: string;
        tenantName: string;
        lastSeenAt: Date | null;
        createdAt: Date;
    }[]>;
    listTestAccountsForSuperadmin(viewer: SessionUser): Promise<{
        role: string;
        name: string;
        email: string;
        password: string;
        scope: string;
        notes: string;
    }[]>;
    moderateTenant(viewer: SessionUser, tenantId: string, input: {
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
    }): Promise<{
        id: string;
        name: string;
        plan: string;
        effectivePlan: string;
        effectivePlanLabel: string;
        billingMode: string;
        customPlan: {
            enabled: boolean;
            name: string;
            monthlyPrice: number;
            maxUsers: number;
            maxWorkOrders: number | null;
            features: any;
        } | null;
        status: string;
        contractStatus: ContractStatus;
        warningLevel: WarningLevel;
        moderationNote: string | null;
        maxCapacity: number;
        createdAt: Date;
        billingCycle: BillingCycle;
        planStartAt: Date;
        planEndsAt: Date;
        nextRenewalAt: Date;
        autoRenew: boolean;
        remainingDays: number;
        effectiveMonthlyPrice: number;
        owner: string;
        ownerEmail: string;
        employees: number;
        totalUsers: number;
        activeOrders: number;
        monthlyRevenue: number;
    }[]>;
    private createSession;
    private createEphemeralSession;
    private getOrCreateDefaultTenant;
    private findPortalClientsByEmail;
    private ensureAdminTables;
    private assertSuperadmin;
    private getTenantAdminSettings;
    private normalizeBillingCycle;
    private parseDateInput;
    private resolvePlanEndDate;
    private resolveWarningLevel;
    private resolveTenantContract;
    private getTenantStatusMap;
    private getTenantStatus;
    private initialsFromName;
}
export {};
