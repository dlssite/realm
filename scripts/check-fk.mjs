import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Does the FK currently exist in the DB?
const fkExists = await prisma.$queryRaw`
  SELECT conname FROM pg_constraint 
  WHERE conname = 'projects_team_id_fkey'
`;
console.log('projects_team_id_fkey exists:', fkExists.length > 0);

// Are there any rows in projects with a team_id that isn't in teams?
const orphans = await prisma.$queryRaw`
  SELECT p.id, p.name, p.team_id, t.id AS team_exists
  FROM projects p
  LEFT JOIN teams t ON t.id = p.team_id
  WHERE p.team_id IS NOT NULL AND t.id IS NULL
`;
console.log('Orphaned projects:', orphans);

// All projects with team_id set
const withTeam = await prisma.$queryRaw`
  SELECT p.id, p.name, p.team_id FROM projects WHERE team_id IS NOT NULL
`;
console.log('Projects with team_id:', withTeam);

// All teams
const teams = await prisma.$queryRaw`SELECT id, name FROM teams`;
console.log('All teams:', teams);

await prisma.$disconnect();
