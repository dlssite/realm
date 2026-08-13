# 16. Testing Strategy

## 16.1 Testing Pyramid

```
         /\
        /  \       E2E Tests (Playwright) — Critical paths (Auth, Task creation flow)
       /----\
      /      \     API Integration Tests (Vitest + Supertest) — Endpoints & database
     /--------\
    /          \   Unit Tests (Vitest) — Services, utility functions, hooks
   /------------\
```

---

## 16.2 Test Matrix & Tools

| Level | Framework | Scope |
|---|---|---|
| **Unit Tests** | Vitest | Backend services, utility functions, custom React hooks. |
| **Component Tests** | Vitest + React Testing Library | Interactive UI components (`data-table`, `command-palette`). |
| **API Integration** | Vitest + Supertest | Fastify REST endpoints running against test PostgreSQL DB. |
| **E2E Tests** | Playwright | Full end-to-end user journeys in headless chromium. |

---

## 16.3 Testing Standards

- **Isolation**: Each test runs independently with isolated database test transactions.
- **Mocking**: Mock external third-party services (S3 MinIO, AI LLM provider APIs); never mock internal core modules.
- **Coverage Minimums**: 80% coverage on core services; 60% coverage on shared UI components.
