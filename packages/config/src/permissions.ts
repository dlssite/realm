export const ROLE_HIERARCHY = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  guest: 1
} as const;

export const DEFAULT_PERMISSIONS = {
  projects: {
    create: ['owner', 'admin', 'manager', 'member'],
    read: ['owner', 'admin', 'manager', 'member', 'guest'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin'],
    manage: ['owner', 'admin']
  },
  tasks: {
    create: ['owner', 'admin', 'manager', 'member'],
    read: ['owner', 'admin', 'manager', 'member', 'guest'],
    update: ['owner', 'admin', 'manager', 'member'],
    delete: ['owner', 'admin', 'manager'],
    manage: ['owner', 'admin']
  },
  wiki: {
    create: ['owner', 'admin', 'manager'],
    read: ['owner', 'admin', 'manager', 'member', 'guest'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin'],
    manage: ['owner', 'admin']
  }
} as const;
