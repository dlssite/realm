# 11. Authentication & Permissions

## 11.1 Authentication (Better Auth)

- **Session Handling**: Database-backed sessions managed via HTTP-Only, SameSite=Lax secure cookies.
- **Auth Methods**: Email + password (argon2id), OAuth 2.0 (Google, GitHub), TOTP Multi-Factor Authentication.
- **Session Duration**: 30-day sliding window.

---

## 11.2 Role Hierarchy

```
Owner
  └── Admin
       └── Manager
            └── Member
                 └── Guest
```

| Role | Scope | Capabilities |
|---|---|---|
| **Owner** | Workspace | Full control. Workspace billing, deletion, ownership transfer. |
| **Admin** | Workspace | Manage members, settings, integrations, permissions. |
| **Manager** | Team / Project | Manage team members, create/archive projects in team scope. |
| **Member** | Workspace | Create tasks, documents, comments in assigned projects. |
| **Guest** | Resource | View-only access to specifically shared resources. |

---

## 11.3 Permission Engine

Permissions are hierarchical and additive:

```
Workspace Permissions ──► Team Permissions ──► Project Permissions ──► Resource Permissions
```

```typescript
type Permission = {
  resource: string;   // 'projects', 'tasks', 'wiki', 'files'
  action: string;     // 'create', 'read', 'update', 'delete', 'manage'
};
```

- **API Enforcement**: Checked strictly in Fastify route `preHandler` hooks or service boundary.
- **Frontend Checks**: `usePermissions()` custom hook dynamically toggles UI element visibility.
