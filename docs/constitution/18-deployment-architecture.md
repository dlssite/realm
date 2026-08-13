# 18. Deployment Architecture

## 18.1 Self-Hosted Docker Compose Infrastructure

Realm is packaged for self-hosting using **Docker Compose** behind a **Caddy** reverse proxy:

```yaml
services:
  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
    restart: always

  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
    environment:
      - DATABASE_URL=postgresql://realm:${POSTGRES_PASSWORD}@postgres:5432/realm
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
    depends_on:
      - postgres
      - minio

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=realm
      - POSTGRES_USER=realm
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data

volumes:
  postgres_data:
  minio_data:
  caddy_data:
```

---

## 18.2 Backup & Maintenance Strategy

- **PostgreSQL Database Backups**: Daily automated `pg_dump` compressed snapshots. Retention: 7 daily, 4 weekly, 3 monthly.
- **MinIO S3 Data Backups**: Synchronized daily using `mc mirror`.
- **System Updates**: `git pull` → `pnpm install` → `prisma migrate deploy` → `docker compose up -d`.
