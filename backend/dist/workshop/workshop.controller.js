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
exports.WorkshopController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../auth/auth.service");
const workshop_service_1 = require("./workshop.service");
let WorkshopController = class WorkshopController {
    authService;
    workshopService;
    constructor(authService, workshopService) {
        this.authService = authService;
        this.workshopService = workshopService;
    }
    async dashboard(authorization) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.getDashboardSummary(user);
    }
    async clients(authorization, search) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.listClients(user, search);
    }
    async intake(authorization, body) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.createIntake(user, body);
    }
    async vehicleHistory(authorization, vehicleId) {
        const user = await this.authService.requireSession(authorization);
        return this.workshopService.getVehicleHistory(user, vehicleId);
    }
    async sessions(authorization) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.authService.listSessions(user);
    }
    async clientPortal(authorization) {
        const user = await this.authService.requireSession(authorization, 'client');
        return this.workshopService.getClientPortal(user);
    }
    async addClientPortalVehicle(authorization, body) {
        const user = await this.authService.requireSession(authorization, 'client');
        return this.workshopService.addVehicleToClientPortal(user, body);
    }
    async updateClientPortalVehicleProfile(authorization, vehicleId, body) {
        const user = await this.authService.requireSession(authorization, 'client');
        return this.workshopService.updateClientPortalVehicleProfile(user, vehicleId, body ?? {});
    }
    async appointmentsBoard(authorization) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.getAppointmentsBoard(user);
    }
    async moveBoardItem(authorization, body) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.moveBoardItem(user, body);
    }
    async workOrders(authorization) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.listWorkOrders(user);
    }
    async mechanics(authorization) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.listMechanics(user);
    }
    async workOrderDetail(authorization, workOrderId) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.getWorkOrderDetail(user, workOrderId);
    }
    async inventoryItems(authorization) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.listInventoryItems(user);
    }
    async createInventoryItem(authorization, body) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.createInventoryItem(user, body);
    }
    async addPartToWorkOrder(authorization, workOrderId, body) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.addPartToWorkOrder(user, workOrderId, body);
    }
    async updateWorkOrder(authorization, workOrderId, body) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.updateWorkOrder(user, workOrderId, body ?? {});
    }
    async financesSummary(authorization, period) {
        const user = await this.authService.requireSession(authorization, 'staff');
        return this.workshopService.getFinanceSummary(user, period);
    }
};
exports.WorkshopController = WorkshopController;
__decorate([
    (0, common_1.Get)('dashboard/summary'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('clients'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "clients", null);
__decorate([
    (0, common_1.Post)('clients/intake'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "intake", null);
__decorate([
    (0, common_1.Get)('vehicles/:vehicleId/history'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "vehicleHistory", null);
__decorate([
    (0, common_1.Get)('sessions'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "sessions", null);
__decorate([
    (0, common_1.Get)('client-portal/me'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "clientPortal", null);
__decorate([
    (0, common_1.Post)('client-portal/vehicles'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "addClientPortalVehicle", null);
__decorate([
    (0, common_1.Post)('client-portal/vehicles/:vehicleId/profile'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('vehicleId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "updateClientPortalVehicleProfile", null);
__decorate([
    (0, common_1.Get)('appointments/board'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "appointmentsBoard", null);
__decorate([
    (0, common_1.Post)('appointments/board/move'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "moveBoardItem", null);
__decorate([
    (0, common_1.Get)('work-orders'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "workOrders", null);
__decorate([
    (0, common_1.Get)('staff/mechanics'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "mechanics", null);
__decorate([
    (0, common_1.Get)('work-orders/:workOrderId'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('workOrderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "workOrderDetail", null);
__decorate([
    (0, common_1.Get)('inventory/items'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "inventoryItems", null);
__decorate([
    (0, common_1.Post)('inventory/items'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "createInventoryItem", null);
__decorate([
    (0, common_1.Post)('work-orders/:workOrderId/parts'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('workOrderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "addPartToWorkOrder", null);
__decorate([
    (0, common_1.Post)('work-orders/:workOrderId/update'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('workOrderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "updateWorkOrder", null);
__decorate([
    (0, common_1.Get)('finances/summary'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WorkshopController.prototype, "financesSummary", null);
exports.WorkshopController = WorkshopController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        workshop_service_1.WorkshopService])
], WorkshopController);
//# sourceMappingURL=workshop.controller.js.map