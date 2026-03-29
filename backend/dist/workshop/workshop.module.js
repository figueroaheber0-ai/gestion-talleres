"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkshopModule = void 0;
const common_1 = require("@nestjs/common");
const workshop_controller_1 = require("./workshop.controller");
const workshop_service_1 = require("./workshop.service");
const auth_module_1 = require("../auth/auth.module");
let WorkshopModule = class WorkshopModule {
};
exports.WorkshopModule = WorkshopModule;
exports.WorkshopModule = WorkshopModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [workshop_controller_1.WorkshopController],
        providers: [workshop_service_1.WorkshopService],
    })
], WorkshopModule);
//# sourceMappingURL=workshop.module.js.map