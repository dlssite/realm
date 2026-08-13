import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Null out ALL projects where team_id doesn't exist in teams
const fixed = await prisma.$executeRaw`
  UPDATE projects SET team_id = NULL
  WHERE team_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM teams WHERE teams.id = projects.team_id)`;
console.log(`Orphaned project rows fixed: ${fixed}`);

// Confirm zero orphans remain
const remaining = await prisma.$queryRaw`
  SELECT COUNT(*) AS cnt FROM projects
  WHERE team_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM teams WHERE teams.id = projects.team_id)`;
console.log('Orphans remaining:', remaining);

await prisma.$disconnect();
