import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Only create Prisma client if we're not in a build environment
const createPrismaClient = (): PrismaClient | undefined => {
  // Skip database connection during build time
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) {
    console.log('Skipping Prisma client creation during build');
    return undefined;
  }

  return new PrismaClient({
    log: ['error'], // Add error logging for debugging
  });
};

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
