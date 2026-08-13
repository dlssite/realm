import { prisma } from '../../infrastructure/database/prisma';
import { DEFAULT_PERMISSIONS, ROLE_HIERARCHY } from '@realm/config';

export type ResourceName = keyof typeof DEFAULT_PERMISSIONS;
export type ActionName = 'create' | 'read' | 'update' | 'delete' | 'manage';

export class PermissionService {
  /**
   * Evaluates if a user has permission to perform an action on a resource within a workspace.
   */
  static async check(
    userId: string,
    workspaceId: string,
    resource: ResourceName,
    action: ActionName
  ): Promise<boolean> {
    // 1. Fetch user membership in workspace
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) return false;

    // Resolve the allowed roles defined in config
    const resourceRules = DEFAULT_PERMISSIONS[resource];
    if (!resourceRules) return false;

    const allowedRoles = (resourceRules as any)[action] as string[];
    if (!allowedRoles) return false;

    // Direct match check
    const userRole = member.role.toLowerCase();
    if (allowedRoles.includes(userRole)) return true;

    // Rank evaluation (higher roles inherit lower permissions)
    const userRank = (ROLE_HIERARCHY as any)[userRole] || 0;
    const isAuthorized = allowedRoles.some((allowedRole) => {
      const allowedRank = (ROLE_HIERARCHY as any)[allowedRole] || 0;
      return userRank >= allowedRank;
    });

    return isAuthorized;
  }
}
