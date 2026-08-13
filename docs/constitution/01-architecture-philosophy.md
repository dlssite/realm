# 1. Architecture Philosophy

## 1.1 Why This Architecture Was Chosen

Realm is designed from the ground up to be built and maintained by **a single developer assisted by AI coding tools** over a period of **years**. This constraint shapes every decision in this document.

### We Reject:
- Enterprise architectures designed for large 50-person engineering teams.
- Microservice sprawl requiring dedicated DevOps infrastructure.
- Abstraction layers that exist purely "in case we need them".
- Framework-of-the-month chasing.

### We Embrace:
- A **Modular Monolith**: One deployable unit with strict internal boundaries.
- **Boring, Proven Technologies**: PostgreSQL, Fastify, React, TypeScript, Prisma, Tailwind CSS.
- **Convention Over Configuration**: Predictable patterns lower cognitive load.
- **Vertical Slices**: Features own their stack end-to-end from UI to database schemas.
- **Explicit Over Implicit**: Code readable linearly without tribal knowledge or magical runtime hooks.

---

## 1.2 How It Differs From Monolithic Applications

Traditional monoliths tend to deteriorate over time into tangled spaghetti code where business logic leaks into UI routes and database queries scatter everywhere.

Realm is a **Modular Monolith**:

```
┌────────────────────────────────────────────────────────┐
│                   Realm Application                    │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │  Projects  │  │   Tasks    │  │   Wiki (TipTap)  │  │
│  │   Module   │  │   Module   │  │      Module      │  │
│  └────────────┘  └────────────┘  └──────────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ AI Assistant│  │Files (MinIO│  │ Calendar Module  │  │
│  │   Module   │  │  Module    │  │                  │  │
│  └────────────┘  └────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │                  Core Platform                   │  │
│  │     Auth · RBAC Permissions · Search · Events    │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │             Shared Infrastructure                │  │
│  │  PostgreSQL · MinIO Storage · pg-boss · Cache    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

Each feature module:
- Owns its own routes, components, services, and schemas.
- Communicates with other modules strictly via explicit interfaces or events.
- Can be modified, tested, and reasoned about independently.

---

## 1.3 How a Solo Developer Can Maintain It

1. **Small files**: No file exceeds 300 lines. Split when code grows beyond that.
2. **Predictable structure**: Every module follows the exact same folder layout.
3. **No hidden magic**: Explicit control flow makes debugging straightforward.
4. **Progressive complexity**: Add complexity only when current implementations fail.
5. **Self-documenting codebase**: TypeScript types and clear naming document intent.

---

## 1.4 How AI Coding Assistants Interact With It

AI assistants are first-class contributors. The architecture maximizes AI efficiency:

- **Bounded File Sizes**: Context fits comfortably in context windows without truncation.
- **Consistent Modular Patterns**: AI easily replicates established directory conventions.
- **Explicit TypeScript Interfaces**: Types provide complete context for intelligent completion.
- **Self-Contained Modules**: AI modifies individual modules without requiring global codebase scanning.
