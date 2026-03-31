import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('Seeding database...');

  // 1. Create Default Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant-id' },
    update: {},
    create: {
      id: 'default-tenant-id',
      name: 'Taller 2R - Local',
      subscriptionPlan: 'pro',
      maxCapacity: 15,
    },
  });

  console.log(`- Created/Verified Tenant: ${tenant.name}`);

  // 2. Create Demo Users
  const users = [
    {
      name: 'Herber Super Admin',
      email: 'herber.superadmin@81cc.app',
      role: 'superadmin',
      password: 'HerberAdmin2026!',
    },
    {
      name: 'Roberto Diaz',
      email: 'admin@taller2r.com',
      role: 'owner',
      password: 'admin123',
    },
    {
      name: 'Carlos Lopez',
      email: 'mecanico@taller2r.com',
      role: 'mechanic',
      password: '1234',
    },
  ];

  for (const userData of users) {
    await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: userData.email,
        },
      },
      update: {
        passwordHash: hashPassword(userData.password),
        role: userData.role,
      },
      create: {
        tenantId: tenant.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        passwordHash: hashPassword(userData.password),
      },
    });
    console.log(`- Seeded User: ${userData.email}`);
  }

  // 3. Create Test Client
  const clientEmail = 'juan@cliente.com';
  const clientPassword = 'cliente123';

  const client = await prisma.client.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: clientEmail,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Juan Perez',
      email: clientEmail,
      phone: '+54 9 11 1234-5678',
    },
  });

  await prisma.clientPortalAccount.upsert({
    where: { clientId: client.id },
    update: {
      passwordHash: hashPassword(clientPassword),
    },
    create: {
      clientId: client.id,
      passwordHash: hashPassword(clientPassword),
    },
  });

  console.log(`- Seeded Client: ${clientEmail} (Password: ${clientPassword})`);

  // 4. Create a Vehicle for the Client
  await prisma.vehicle.upsert({
    where: {
      tenantId_plate: {
        tenantId: tenant.id,
        plate: 'ABC-123',
      },
    },
    update: {
      clientId: client.id,
    },
    create: {
      tenantId: tenant.id,
      clientId: client.id,
      plate: 'ABC-123',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2022,
    },
  });

  console.log(`- Seeded Vehicle: ABC-123 for client ${clientEmail}`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
