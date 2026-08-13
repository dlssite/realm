/**
 * Clears the _prisma_migrations table so db push has no history to replay.
 * The live schema is already correct — this just removes the stale records
 * that cause the shadow DB to trip on FK violations.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const rows = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations ORDER BY finished_at`;
console.log('Current migration records:', rows.map(r => r.migration_name));

await prisma.$executeRaw`DELETE FROM _prisma_migrations`;
console.log('✅ Migration history cleared.');

await prisma.$disconnect();
