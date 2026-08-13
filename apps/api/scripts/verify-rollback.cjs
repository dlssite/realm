const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Starting rollback verification script');

  // Create a test user
  const id = require('crypto').randomUUID();
  const user = await prisma.user.create({ data: { id, email: `test+rollback@local`, name: 'Rollback Tester', passwordHash: 'x' } });
  const workspaceId = require('crypto').randomUUID();
  const workspace = await prisma.workspace.create({ data: { id: workspaceId, name: 'Rollback WS', slug: `rollback-ws-${Date.now()}`, createdById: user.id } });

  // Create a page
  const pageId = require('crypto').randomUUID();
  const page = await prisma.wikiPage.create({ data: { id: pageId, title: 'Rollback Page', slug: 'rollback-page', workspaceId: workspace.id, createdById: user.id } });

  // Create initial version
  const v1 = await prisma.wikiPageVersion.create({ data: { id: require('crypto').randomUUID(), pageId: page.id, title: page.title, content: { blocks: [{ type: 'p', text: 'v1' }] }, versionNumber: 1, createdById: user.id } });
  // Update and create v2
  const v2 = await prisma.wikiPageVersion.create({ data: { id: require('crypto').randomUUID(), pageId: page.id, title: page.title, content: { blocks: [{ type: 'p', text: 'v2' }] }, versionNumber: 2, createdById: user.id } });
  // Update and create v3
  const v3 = await prisma.wikiPageVersion.create({ data: { id: require('crypto').randomUUID(), pageId: page.id, title: page.title, content: { blocks: [{ type: 'p', text: 'v3' }] }, versionNumber: 3, createdById: user.id } });

  console.log('Created versions:', v1.id, v2.id, v3.id);

  // Now perform a restore of v1 (simulate endpoint behavior)
  const latest = await prisma.wikiPageVersion.findMany({ where: { pageId: page.id }, orderBy: { versionNumber: 'desc' }, take: 1 });
  const nextVersion = (latest?.[0]?.versionNumber ?? 0) + 1;

  const restored = await prisma.wikiPageVersion.create({ data: { id: require('crypto').randomUUID(), pageId: page.id, title: v1.title, content: v1.content, versionNumber: nextVersion, createdById: user.id } });

  console.log('Restored new version id:', restored.id, 'number:', restored.versionNumber);

  const versions = await prisma.wikiPageVersion.findMany({ where: { pageId: page.id }, orderBy: { versionNumber: 'desc' } });
  console.log('All versions (desc):', versions.map((v) => ({ id: v.id, number: v.versionNumber, content: v.content })));

  // cleanup
  // Note: keep created records for inspection; uncomment to delete
  // await prisma.wikiPageVersion.deleteMany({ where: { pageId: page.id } });
  // await prisma.wikiPage.delete({ where: { id: page.id } });
  // await prisma.workspace.delete({ where: { id: workspace.id } });
  // await prisma.user.delete({ where: { id: user.id } });

  await prisma.$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
