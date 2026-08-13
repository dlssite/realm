# 13. AI Development Rules

## 13.1 Rules for AI Coding Assistants

1. **Read Constitution First**: Always inspect relevant `docs/constitution/*.md` files before generating architectural or structural code.
2. **Never Create Unnecessary Abstractions**: Avoid generic abstract classes, generic repositories, or factory patterns for single-use implementations.
3. **Never Modify Unrelated Modules**: Keep code modifications strictly scoped to the feature requested.
4. **Explain Rationale Before Coding**: Provide a brief technical breakdown listing target files and approach before producing code blocks.
5. **Keep Files Small (< 300 Lines)**: Split components or services that exceed 300 lines into logical sub-files.
6. **Follow Existing Conventions**: Match the established directory schemas, file naming conventions, and code formatting rules.
7. **Ask Before Major Structural Changes**: Request user approval before altering schemas, introducing third-party dependencies, or editing build scripts.
8. **Prefer Incremental Edits**: Implement changes incrementally: Data Model → Backend Service → API Routes → Frontend Hooks → UI Components.
9. **Define Types & Schemas First**: Define TypeScript interfaces in `@realm/types` and Zod validation schemas prior to implementation.
10. **Include Happy Path Unit Tests**: Write unit tests for new backend service functions upon creation.
11. **Maintain Code Comments**: Preserve existing JSDoc comments and inline documentation.
12. **Verify Imports & Signatures**: Ensure all imported types, utilities, and components exist and match signature contracts.
13. **Check Build Integrity**: Ensure code compiles without TypeScript compilation errors or circular dependency loops.
