const { execSync } = require('child_process');
const path = require('path');

try {
  // Use require.resolve to find the prisma package even if the path is slightly different on Render
  const prismaPkgPath = require.resolve('prisma/package.json');
  const prismaDir = path.dirname(prismaPkgPath);
  const prismaBinJS = path.join(prismaDir, 'build', 'index.js');
  
  console.log('--- Prisma Migrate Bypass ---');
  console.log('Found prisma package at:', prismaDir);
  console.log('Running migrate using node directly:', prismaBinJS);
  
  // Running with node directly avoids shell 'Permission denied' on .bin/prisma
  execSync(`node "${prismaBinJS}" migrate deploy`, { stdio: 'inherit' });
  console.log('--- Prisma Migrate Finished Successfully ---');
} catch (e) {
  console.error('--- Prisma Migrate Bypass Failed ---');
  console.error('Error details:', e.message);
  process.exit(1);
}
