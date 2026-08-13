# Section 8: Authentication, Permissions, Search & Security

## 8.1 Authentication (Better Auth Integration)

- **Session Management**: Session tokens stored in HTTP-Only, SameSite=Lax secure cookies.
- **Provider Support**: Local email + argon2id password hashing, OAuth (Google, GitHub), and TOTP Multi-Factor Authentication.
- **Session Duration**: 30 days sliding window session validity.

---

## 8.2 Role & Permission Model (RBAC)

Hierarchical Role Inheritance Model:

```
Owner (Workspace Owner - Full Privileges & Billing Control)
  └── Admin (Workspace Administration, Member Management, Integrations)
       └── Manager (Team Lead, Project Management, Deletion Rights within Team Scope)
            └── Member (Standard Workspace Contributor)
                 └── Guest (Scoped view-only access to specifically shared items)
```

- **API Enforcement**: All endpoints check permissions at the Fastify middleware / service boundary. Client permission hooks (`usePermissions()`) only customize UX visibility.

---

## 8.3 Global Search Architecture

- **Engine**: PostgreSQL native `pg_trgm` GIN indexes + `tsvector` weighted full-text search.
- **Search Scope**: Indexes Titles, Descriptions, Wiki Page Markdown, Comments, User Names, and Filenames across the workspace.
- **Command Palette Search API**: Returns formatted search hits with module badges, text highlights, and routing deep-links in under 50ms.

---

## 8.4 Security & Self-Hosting Hardening

1. **Strict Input Sanitization**: All user-generated content and TipTap rich-text inputs are sanitized server-side with strict HTML tag whitelists to prevent XSS.
2. **MinIO Storage Security**: Files are stored in private MinIO S3 buckets. Access requires 15-minute expiring presigned URLs issued strictly after authorization checks.
3. **API Rate Limiting**: Fastify `@fastify/rate-limit` caps requests per IP/user (100 req/min for general endpoints; 5 req/min for login attempts).
4. **Encrypted Secrets at Rest**: Third-party API keys (e.g. AI Provider keys) are encrypted in PostgreSQL using AES-256-GCM prior to storage.
