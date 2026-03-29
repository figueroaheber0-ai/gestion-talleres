import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { WorkshopService } from './workshop.service';

@Controller()
export class WorkshopController {
  constructor(
    private readonly authService: AuthService,
    private readonly workshopService: WorkshopService,
  ) {}

  @Get('dashboard/summary')
  async dashboard(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.getDashboardSummary(user);
  }

  @Get('clients')
  async clients(
    @Headers('authorization') authorization?: string,
    @Query('search') search?: string,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.listClients(user, search);
  }

  @Post('clients/intake')
  async intake(
    @Headers('authorization') authorization?: string,
    @Body()
    body?: {
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
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.createIntake(user, body!);
  }

  @Get('vehicles/:vehicleId/history')
  async vehicleHistory(
    @Headers('authorization') authorization?: string,
    @Param('vehicleId') vehicleId?: string,
  ) {
    const user = await this.authService.requireSession(authorization);
    return this.workshopService.getVehicleHistory(user, vehicleId!);
  }

  @Get('sessions')
  async sessions(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.authService.listSessions(user);
  }

  @Get('client-portal/me')
  async clientPortal(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireSession(authorization, 'client');
    return this.workshopService.getClientPortal(user);
  }

  @Post('client-portal/vehicles')
  async addClientPortalVehicle(
    @Headers('authorization') authorization?: string,
    @Body()
    body?: {
      plate: string;
      brand: string;
      model: string;
      year?: number;
    },
  ) {
    const user = await this.authService.requireSession(authorization, 'client');
    return this.workshopService.addVehicleToClientPortal(user, body!);
  }

  @Post('client-portal/vehicles/:vehicleId/profile')
  async updateClientPortalVehicleProfile(
    @Headers('authorization') authorization?: string,
    @Param('vehicleId') vehicleId?: string,
    @Body()
    body?: {
      alias?: string | null;
      color?: string | null;
      notes?: string | null;
      insuranceProvider?: string | null;
      policyNumber?: string | null;
    },
  ) {
    const user = await this.authService.requireSession(authorization, 'client');
    return this.workshopService.updateClientPortalVehicleProfile(user, vehicleId!, body ?? {});
  }

  @Get('appointments/board')
  async appointmentsBoard(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.getAppointmentsBoard(user);
  }

  @Post('appointments/board/move')
  async moveBoardItem(
    @Headers('authorization') authorization?: string,
    @Body()
    body?: {
      itemId: string;
      sourceColumn: 'agendados' | 'diagnostico' | 'reparacion' | 'listos';
      targetColumn: 'diagnostico' | 'reparacion' | 'listos';
    },
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.moveBoardItem(user, body!);
  }

  @Get('work-orders')
  async workOrders(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.listWorkOrders(user);
  }

  @Get('staff/mechanics')
  async mechanics(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.listMechanics(user);
  }

  @Get('work-orders/:workOrderId')
  async workOrderDetail(
    @Headers('authorization') authorization?: string,
    @Param('workOrderId') workOrderId?: string,
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.getWorkOrderDetail(user, workOrderId!);
  }

  @Get('inventory/items')
  async inventoryItems(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.listInventoryItems(user);
  }

  @Post('inventory/items')
  async createInventoryItem(
    @Headers('authorization') authorization?: string,
    @Body()
    body?: {
      name: string;
      sku?: string;
      stockQuantity?: number;
      minAlert?: number;
      price?: number;
    },
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.createInventoryItem(user, body!);
  }

  @Post('work-orders/:workOrderId/parts')
  async addPartToWorkOrder(
    @Headers('authorization') authorization?: string,
    @Param('workOrderId') workOrderId?: string,
    @Body()
    body?: {
      itemId: string;
      quantity: number;
      unitPrice: number;
      internalCost: number;
      providedByClient?: boolean;
    },
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.addPartToWorkOrder(user, workOrderId!, body!);
  }

  @Post('work-orders/:workOrderId/update')
  async updateWorkOrder(
    @Headers('authorization') authorization?: string,
    @Param('workOrderId') workOrderId?: string,
    @Body()
    body?: {
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
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.updateWorkOrder(user, workOrderId!, body ?? {});
  }

  @Get('finances/summary')
  async financesSummary(
    @Headers('authorization') authorization?: string,
    @Query('period') period?: 'dia' | 'semana' | 'mes' | 'anio',
  ) {
    const user = await this.authService.requireSession(authorization, 'staff');
    return this.workshopService.getFinanceSummary(user, period);
  }
}
