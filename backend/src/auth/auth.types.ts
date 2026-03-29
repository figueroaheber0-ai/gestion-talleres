export type StaffRole = 'owner' | 'employee' | 'superadmin';
export type SessionAudience = 'staff' | 'client';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  audience: SessionAudience;
  tenantId?: string;
  clientId?: string;
  sessionId?: string;
}

export interface DemoUserRecord {
  password: string;
  user: Omit<SessionUser, 'id' | 'audience' | 'sessionId'>;
}
