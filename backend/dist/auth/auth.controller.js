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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    login(body, request) {
        return this.authService.loginWithCredentials(body.email, body.password, {
            userAgent: request.headers['user-agent'],
            ipAddress: request.ip,
        }, body.tenantId);
    }
    demoLogin(body, request) {
        return this.authService.loginDemo(body.role, {
            userAgent: request.headers['user-agent'],
            ipAddress: request.ip,
        });
    }
    registerOwner(body) {
        return this.authService.registerOwner(body);
    }
    registerClient(body) {
        return this.authService.registerClient(body);
    }
    clientLogin(body, request) {
        return this.authService.loginClient(body.email, body.password, {
            userAgent: request.headers['user-agent'],
            ipAddress: request.ip,
        });
    }
    async session(authorization) {
        return { user: await this.authService.requireSession(authorization) };
    }
    async staff(authorization) {
        const viewer = await this.authService.requireSession(authorization, 'staff');
        return this.authService.listStaff(viewer);
    }
    async staffInvites(authorization) {
        const viewer = await this.authService.requireSession(authorization, 'staff');
        return this.authService.listStaffInvites(viewer);
    }
    async createStaffInvite(authorization, body) {
        const viewer = await this.authService.requireSession(authorization, 'staff');
        return this.authService.createStaffInvite(viewer, body);
    }
    previewInvite(body) {
        return this.authService.readStaffInvite(body.token);
    }
    acceptInvite(body) {
        return this.authService.acceptStaffInvite(body);
    }
    async superadminTenants(authorization) {
        const viewer = await this.authService.requireSession(authorization, 'staff');
        return this.authService.listTenantsForSuperadmin(viewer);
    }
    async superadminUsers(authorization) {
        const viewer = await this.authService.requireSession(authorization, 'staff');
        return this.authService.listUsersForSuperadmin(viewer);
    }
    async superadminTestAccounts(authorization) {
        const viewer = await this.authService.requireSession(authorization, 'staff');
        return this.authService.listTestAccountsForSuperadmin(viewer);
    }
    async superadminPlans(authorization) {
        const viewer = await this.authService.requireSession(authorization, 'staff');
        return this.authService.listPlansForSuperadmin(viewer);
    }
    async superadminFinances(authorization) {
        const viewer = await this.authService.requireSession(authorization, 'staff');
        return this.authService.getPlatformFinanceSummary(viewer);
    }
    async upsertPlan(authorization, body) {
        const viewer = await this.authService.requireSession(authorization, 'staff');
        return this.authService.upsertPlanForSuperadmin(viewer, body);
    }
    async moderateTenant(authorization, request) {
        const viewer = await this.authService.requireSession(authorization, 'staff');
        const tenantId = Array.isArray(request.params.tenantId)
            ? request.params.tenantId[0]
            : request.params.tenantId;
        return this.authService.moderateTenant(viewer, tenantId, request.body ?? {});
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('demo-login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "demoLogin", null);
__decorate([
    (0, common_1.Post)('register-owner'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "registerOwner", null);
__decorate([
    (0, common_1.Post)('register-client'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "registerClient", null);
__decorate([
    (0, common_1.Post)('client/login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "clientLogin", null);
__decorate([
    (0, common_1.Get)('session'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "session", null);
__decorate([
    (0, common_1.Get)('staff'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "staff", null);
__decorate([
    (0, common_1.Get)('staff/invites'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "staffInvites", null);
__decorate([
    (0, common_1.Post)('staff/invites'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createStaffInvite", null);
__decorate([
    (0, common_1.Post)('staff/invites/preview'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "previewInvite", null);
__decorate([
    (0, common_1.Post)('staff/invites/accept'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "acceptInvite", null);
__decorate([
    (0, common_1.Get)('superadmin/tenants'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "superadminTenants", null);
__decorate([
    (0, common_1.Get)('superadmin/users'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "superadminUsers", null);
__decorate([
    (0, common_1.Get)('superadmin/test-accounts'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "superadminTestAccounts", null);
__decorate([
    (0, common_1.Get)('superadmin/plans'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "superadminPlans", null);
__decorate([
    (0, common_1.Get)('superadmin/finances'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "superadminFinances", null);
__decorate([
    (0, common_1.Post)('superadmin/plans'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "upsertPlan", null);
__decorate([
    (0, common_1.Post)('superadmin/tenants/:tenantId/moderate'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "moderateTenant", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map