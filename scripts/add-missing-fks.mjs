import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

try {
  await prisma.$executeRaw`
    ALTER TABLE projects
    ADD CONSTRAINT projects_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
  `;
  console.log('✅ projects_team_id_fkey added');
} catch (e) {
  if (e.message.includes('already exists')) console.log('⏭️  projects_team_id_fkey already exists');
  else throw e;
}

try {
  await prisma.$executeRaw`
    ALTER TABLE teams
    ADD CONSTRAINT teams_leader_id_fkey
    FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
  `;
  console.log('✅ teams_leader_id_fkey added');
} catch (e) {
  if (e.message.includes('already exists')) console.log('⏭️  teams_leader_id_fkey already exists');
  else throw e;
}

await prisma.$disconnect();
console.log('Done.');
