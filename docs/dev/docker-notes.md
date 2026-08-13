# Docker Notes

All commands are run from the project root on the VPS:
```
cd ~/apps/dockers/realm
```

---

## Full Stack

### Start (first time or after pulling new changes that affect Dockerfiles or packages)
```bash
sudo docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build
```

### Start (no rebuild — just restart containers, e.g. after a config/env change)
```bash
sudo docker compose -f docker/docker-compose.prod.yml --env-file .env up -d
```

### Stop all containers (data volumes are preserved)
```bash
sudo docker compose -f docker/docker-compose.prod.yml down
```

### Stop and wipe all volumes (WARNING: deletes all Postgres and MinIO data)
```bash
sudo docker compose -f docker/docker-compose.prod.yml down -v
```

---

## Rebuild a Specific Service

Use this when you only changed code for one service — much faster than rebuilding everything.

### Rebuild and restart API only
```bash
sudo docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build api
```

### Rebuild and restart Web only
```bash
sudo docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build web
```

### Rebuild both API and Web (skip Postgres, MinIO, Caddy)
```bash
sudo docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build api web
```

---

## Restart a Container Without Rebuilding

Useful when you just want to bounce a container (e.g. after an env change).

```bash
sudo docker restart realm-api
sudo docker restart realm-web
sudo docker restart realm-caddy
sudo docker restart realm-postgres
sudo docker restart realm-minio
```

---

## Logs

### Tail logs for a specific container
```bash
sudo docker logs realm-api -f
sudo docker logs realm-web -f
sudo docker logs realm-caddy -f
sudo docker logs realm-postgres -f
sudo docker logs realm-minio -f
```

### Last 100 lines only
```bash
sudo docker logs realm-api --tail 100
```

---

## Container Status

### Check all containers and their health
```bash
sudo docker ps
```

### Check resource usage (CPU, RAM per container)
```bash
sudo docker stats
```

---

## Database

### Run Prisma migrations manually (normally runs automatically on API startup)
```bash
sudo docker compose -f docker/docker-compose.prod.yml exec api node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma
```

### Open a Postgres shell
```bash
sudo docker exec -it realm-postgres psql -U realm -d realm
```

---

## Deploying a New Version

Standard deploy flow after pushing code changes:

```bash
git pull

# If you changed Dockerfile, packages, or tsconfig:
sudo docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build

# If you only changed API source code:
sudo docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build api

# If you only changed web source code:
sudo docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build web
```

Migrations run automatically when the API container starts. No manual step needed.

---

## Cleanup (free up disk space)

### Remove unused images and build cache
```bash
sudo docker system prune -f
```

### Remove unused images including those not referenced by any container
```bash
sudo docker system prune -af
```

---

## Environment

The `.env` file lives at the project root and is never committed to git.
If you lose it, copy `.env.example` and fill in the values:

```bash
cp .env.example .env
nano .env
```

Required variables for production:
```
REALM_DOMAIN=realm.sanctyr.cloud
POSTGRES_USER=realm
POSTGRES_PASSWORD=<strong password>
DATABASE_URL=postgresql://realm:<password>@postgres:5432/realm
SESSION_SECRET=<run: openssl rand -hex 32>
BETTER_AUTH_SECRET=<run: openssl rand -hex 32>
MINIO_ACCESS_KEY=<minio user>
MINIO_SECRET_KEY=<minio password>
MINIO_ENDPOINT=minio
VITE_API_URL=https://realm.sanctyr.cloud
VITE_APP_URL=https://realm.sanctyr.cloud
```

---

## Container Names Reference

| Container | Role |
|---|---|
| `realm-api` | Fastify API server (port 4000 internal) |
| `realm-web` | nginx serving the Vite SPA (port 3000 internal) |
| `realm-caddy` | Reverse proxy + auto SSL (ports 80/443 public) |
| `realm-postgres` | PostgreSQL 16 database (port 5432 internal) |
| `realm-minio` | MinIO object storage (port 9000 internal) |

All containers are on the `realm-internal` Docker network.
Only Caddy is exposed to the internet.
