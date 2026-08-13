/**
 * apply-migration.mjs
 * 
 * Applies a Prisma-generated migration SQL file directly to the database.
 * Bypasses the shadow DB issue entirely.
 * 
 * Usage:
 *   node --env-file=.env scripts/apply-migration.mjs prisma/migrations/<folder>/migration.sql
 */

import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node --env-file=.env scripts/apply-migration.mjs <path-to-migration.sql>');
  process.exit(1);
}

const sql = readFileSync(sqlFile, 'utf8').trim();
if (!sql || sql.startsWith('--') && sql.split('\n').every(l => l.startsWith('--') || l.trim() === '')) {
  console.log('Migration file is empty or comments-only — nothing to apply.');
  process.exit(0);
}

const prisma = new PrismaClient();

console.log(`Applying: ${sqlFile}`);
console.log('---');

// Split on semicolons and run each statement individually
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

for (const stmt of statements) {
  try {
    await prisma.$executeRawUnsafe(stmt);
    console.log(`✅ ${stmt.slice(0, 80).replace(/\n/g, ' ')}…`);
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('duplicate')) {
      console.log(`⏭️  Already exists — skipping`);
    } else {
      console.error(`❌ Failed: ${e.message}`);
      console.error(`   Statement: ${stmt.slice(0, 200)}`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }
}

await prisma.$disconnect();
console.log('---');
console.log('Migration applied successfully.');
