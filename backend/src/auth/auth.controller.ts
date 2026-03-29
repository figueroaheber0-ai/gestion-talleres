import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginBody, @Req() request: Request) {
    return this.authService.loginWithCredentials(
      body.email,
      body.password,
      {
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
      },
      body.tenantId,
    );
  }

  @Post('demo-login')
  demoLogin(@Body() body: DemoLoginBody, @Req() request: Request) {
    return this.authService.loginDemo(body.role, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
  }

  @Post('register-owner')
  registerOwner(@Body() body: OwnerRegistrationBody) {
    return this.authService.registerOwner(body);
  }

  @Post('register-client')
  registerClient(@Body() body: ClientRegistrationBody) {
    return this.authService.registerClient(body);
  }

  @Post('client/login')
  clientLogin(@Body() body: LoginBody, @Req() request: Request) {
    return this.authService.loginClient(body.email, body.password, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
  }

  @Get('session')
  async session(@Headers('authorization') authorization?: string) {
    return { user: await this.authService.requireSession(authorization) };
  }

  @Get('staff')
  async staff(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(authorization, 'staff');
    return this.authService.listStaff(viewer);
  }

  @Get('staff/invites')
  async staffInvites(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(authorization, 'staff');
    return this.authService.listStaffInvites(viewer);
  }

  @Post('staff/invites')
  async createStaffInvite(
    @Headers('authorization') authorization?: string,
    @Body() body?: StaffInviteBody,
  ) {
    const viewer = await this.authService.requireSession(authorization, 'staff');
    return this.authService.createStaffInvite(viewer, body!);
  }

  @Post('staff/invites/preview')
  previewInvite(@Body() body: { token: string }) {
    return this.authService.readStaffInvite(body.token);
  }

  @Post('staff/invites/accept')
  acceptInvite(@Body() body: AcceptInviteBody) {
    return this.authService.acceptStaffInvite(body);
  }

  @Get('superadmin/tenants')
  async superadminTenants(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(authorization, 'staff');
    return this.authService.listTenantsForSuperadmin(viewer);
  }

  @Get('superadmin/users')
  async superadminUsers(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(authorization, 'staff');
    return this.authService.listUsersForSuperadmin(viewer);
  }

  @Get('superadmin/test-accounts')
  async superadminTestAccounts(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(authorization, 'staff');
    return this.authService.listTestAccountsForSuperadmin(viewer);
  }

  @Get('superadmin/plans')
  async superadminPlans(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(authorization, 'staff');
    return this.authService.listPlansForSuperadmin(viewer);
  }

  @Get('superadmin/finances')
  async superadminFinances(@Headers('authorization') authorization?: string) {
    const viewer = await this.authService.requireSession(authorization, 'staff');
    return this.authService.getPlatformFinanceSummary(viewer);
  }

  @Post('superadmin/plans')
  async upsertPlan(
    @Headers('authorization') authorization?: string,
    @Body()
    body?: {
      code: string;
      name: string;
      monthlyPrice: number;
      maxUsers: number;
      maxWorkOrders?: number | null;
      features?: string[];
      active?: boolean;
    },
  ) {
    const viewer = await this.authService.requireSession(authorization, 'staff');
    return this.authService.upsertPlanForSuperadmin(viewer, body!);
  }

  @Post('superadmin/tenants/:tenantId/moderate')
  async moderateTenant(
    @Headers('authorization') authorization: string | undefined,
    @Req() request: Request,
  ) {
    const viewer = await this.authService.requireSession(authorization, 'staff');
    const tenantId = Array.isArray(request.params.tenantId)
      ? request.params.tenantId[0]
      : request.params.tenantId;
    return this.authService.moderateTenant(viewer, tenantId, request.body ?? {});
  }
}
