import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
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

  private frontendUrl() {
    return process.env.FRONTEND_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';
  }

  private googleCallbackUrl() {
    return (
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      `${process.env.API_PUBLIC_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'}/auth/google/callback`
    );
  }

  private encodeState(payload: { tenantId?: string | null }) {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decodeState(rawState?: string) {
    if (!rawState) return {};
    try {
      const decoded = Buffer.from(rawState, 'base64url').toString('utf8');
      return JSON.parse(decoded) as { tenantId?: string | null };
    } catch {
      return {};
    }
  }

  private loginRedirect(params: Record<string, string | number>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      search.set(key, String(value));
    });
    return `${this.frontendUrl()}/login?${search.toString()}`;
  }

  @Get('google/start')
  googleStart(
    @Res() response: Response,
    @Query('tenantId') tenantId?: string,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

    if (!clientId) {
      return response.redirect(
        this.loginRedirect({
          googleError: 'Configuracion de Google no disponible',
        }),
      );
    }

    const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleUrl.searchParams.set('client_id', clientId);
    googleUrl.searchParams.set('redirect_uri', this.googleCallbackUrl());
    googleUrl.searchParams.set('response_type', 'code');
    googleUrl.searchParams.set('scope', 'openid email profile');
    googleUrl.searchParams.set('prompt', 'select_account');
    googleUrl.searchParams.set('state', this.encodeState({ tenantId: tenantId ?? null }));

    return response.redirect(googleUrl.toString());
  }

  @Get('google/callback')
  async googleCallback(
    @Res() response: Response,
    @Req() request: Request,
    @Query('code') code?: string,
    @Query('state') state?: string,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret || !code) {
      return response.redirect(
        this.loginRedirect({
          googleError: 'No se pudo validar Google',
        }),
      );
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: this.googleCallbackUrl(),
          grant_type: 'authorization_code',
        }),
      });

      const tokenPayload = (await tokenResponse.json()) as {
        access_token?: string;
      };

      if (!tokenResponse.ok || !tokenPayload.access_token) {
        return response.redirect(
          this.loginRedirect({
            googleError: 'No se pudo completar la autenticacion con Google',
          }),
        );
      }

      const profileResponse = await fetch(
        'https://openidconnect.googleapis.com/v1/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokenPayload.access_token}`,
          },
        },
      );

      const profilePayload = (await profileResponse.json()) as {
        email?: string;
        name?: string;
      };

      if (!profileResponse.ok || !profilePayload.email) {
        return response.redirect(
          this.loginRedirect({
            googleError: 'No se pudo leer el perfil de Google',
          }),
        );
      }

      this.decodeState(state);

      const session = await this.authService.loginWithGoogle(
        profilePayload.email,
        profilePayload.name ?? profilePayload.email,
        {
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip,
        },
      );

      return response.redirect(
        this.loginRedirect({
          googleToken: session.token,
          googleExpiresAt: session.expiresAt,
          googleRole: session.user.role,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo iniciar sesion con Google';
      return response.redirect(
        this.loginRedirect({
          googleError: message,
        }),
      );
    }
  }

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

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }
}
