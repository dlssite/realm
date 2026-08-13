# 17. Security Standards

## 17.1 Auth & Session Security
- Passwords hashed using **argon2id** or bcrypt with cost factor 12.
- Session tokens stored in HTTP-Only, SameSite=Lax secure cookies.
- Rate limiting on login: Max 5 attempts per minute per IP. Account lockout after 10 failures.

## 17.2 Authorization & Data Isolation
- API endpoints enforce RBAC permission policies at the Fastify layer.
- Multi-Tenant Data Isolation: All SQL queries filter by `workspaceId`.

## 17.3 Input Validation & XSS Prevention
- All API inputs validated using **Zod** schemas.
- TipTap rich text HTML outputs sanitized server-side with strict element tag whitelisting.

## 17.4 File & Storage Security
- Files stored in private MinIO S3 buckets. Access granted via 15-minute expiring presigned URLs.
- Upload file validation checks magic bytes (file headers) rather than file extensions alone.

## 17.5 Secret Management & Headers
- Third-party API keys (e.g. LLM keys) encrypted at rest in PostgreSQL using AES-256-GCM.
- Fastify security headers applied: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.
