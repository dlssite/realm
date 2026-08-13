import { prisma } from '../../infrastructure/database/prisma';

/**
 * Generates the next sequential display identifier for a resource.
 * Example: "PROJ-1", "PROJ-2", "TASK-101"
 */
export async function generateIdentifier(
  workspaceId: string,
  prefix: string,
  modelName: 'project' | 'task'
): Promise<string> {
  // Count existing records (including soft-deleted) for uniqueness
  const count =
    modelName === 'project'
      ? await prisma.project.count({ where: { workspaceId } })
      : await prisma.task.count({ where: { workspaceId } });

  return `${prefix}-${count + 1}`;
}
