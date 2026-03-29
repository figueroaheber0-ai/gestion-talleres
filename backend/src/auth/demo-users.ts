import { DemoUserRecord, StaffRole } from './auth.types';

export const DEMO_USERS: Record<StaffRole, DemoUserRecord> = {
  employee: {
    password: '1234',
    user: {
      name: 'Carlos Lopez',
      email: 'mecanico@taller2r.com',
      role: 'employee',
      avatar: 'CL',
      tenantId: '',
    },
  },
  owner: {
    password: 'admin123',
    user: {
      name: 'Roberto Diaz',
      email: 'admin@taller2r.com',
      role: 'owner',
      avatar: 'RD',
      tenantId: '',
    },
  },
  superadmin: {
    password: 'HerberAdmin2026!',
    user: {
      name: 'Herber Super Admin',
      email: 'herber.superadmin@81cc.app',
      role: 'superadmin',
      avatar: 'HS',
      tenantId: '',
    },
  },
};
