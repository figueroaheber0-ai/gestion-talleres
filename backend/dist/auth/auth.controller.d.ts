import type { Request } from 'express';
import { AuthService } from './auth.service';
import { StaffRole } from './auth.types';
interface LoginBody {
    email: string;
    password: string;
    tenantId?: string;
}
interface DemoLoginBody {
    role: StaffRole;
}
interface OwnerRegistrationBody {
    workshopName: string;
    name: string;
    email: string;
    password: string;
}
interface ClientRegistrationBody {
    name: string;
    email: string;
    phone?: string;
    password: string;
    plate: string;
    brand: string;
    model: string;
    year?: number;
}
interface StaffInviteBody {
    name: string;
    email: string;
    role: StaffRole;
}
interface AcceptInviteBody {
    token: string;
    password: string;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginBody, request: Request): Promise<{
        token: string;
        expiresAt: number;
        user: import("./auth.types").SessionUser;
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
    demoLogin(body: DemoLoginBody, request: Request): Promise<{
        token: string;
        expiresAt: number;
        user: import("./auth.types").SessionUser;
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
    registerOwner(body: OwnerRegistrationBody): Promise<{
        tenantId: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
    }>;
    registerClient(body: ClientRegistrationBody): Promise<{
        ok: boolean;
    }>;
    clientLogin(body: LoginBody, request: Request): Promise<{
        token: string;
        expiresAt: number;
        user: {
            sessionId: string;
            id: string;
            name: string;
            email: string;
            role: string;
            avatar: string;
            audience: import("./auth.types").SessionAudience;
            tenantId?: string;
            clientId?: string;
        };
    }>;
    session(authorization?: string): Promise<{
        user: import("./auth.types").SessionUser;
    }>;
    staff(authorization?: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: string;
        createdAt: Date;
    }[]>;
    staffInvites(authorization?: string): Promise<import("./auth.service").StaffInviteRow[]>;
    createStaffInvite(authorization?: string, body?: StaffInviteBody): Promise<{
        ok: boolean;
        inviteToken: string;
        expiresAt: number;
    }>;
    previewInvite(body: {
        token: string;
    }): Promise<import("./auth.service").StaffInviteRow & {
        tokenHash: string;
    }>;
    acceptInvite(body: AcceptInviteBody): Promise<{
        ok: boolean;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
        tenantName: string;
    }>;
    superadminTenants(authorization?: string): Promise<{
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
        contractStatus: "active" | "expiring" | "expired" | "suspended";
        warningLevel: "expired" | "normal" | "30d" | "15d" | "7d";
        moderationNote: string | null;
        maxCapacity: number;
        createdAt: Date;
        billingCycle: "monthly" | "semiannual" | "annual";
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
    superadminUsers(authorization?: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: string;
        tenantId: string;
        tenantName: string;
        lastSeenAt: Date | null;
        createdAt: Date;
    }[]>;
    superadminTestAccounts(authorization?: string): Promise<{
        role: string;
        name: string;
        email: string;
        password: string;
        scope: string;
        notes: string;
    }[]>;
    superadminPlans(authorization?: string): Promise<{
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
    superadminFinances(authorization?: string): Promise<{
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
    upsertPlan(authorization?: string, body?: {
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
    moderateTenant(authorization: string | undefined, request: Request): Promise<{
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
        contractStatus: "active" | "expiring" | "expired" | "suspended";
        warningLevel: "expired" | "normal" | "30d" | "15d" | "7d";
        moderationNote: string | null;
        maxCapacity: number;
        createdAt: Date;
        billingCycle: "monthly" | "semiannual" | "annual";
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
}
export {};
