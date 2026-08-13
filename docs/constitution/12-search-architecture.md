# 12. Search Architecture

## 12.1 Full-Text Search Strategy

- **Phase 1 (MVP)**: PostgreSQL native full-text search using `pg_trgm` GIN indexes + weighted `tsvector` generated columns.
- **Phase 2 (Future)**: Optional integration with Meilisearch or Typesense for high-scale installations.

---

## 12.2 Search Scope & Weights

| Module | Indexed Fields | Search Weight |
|---|---|---|
| Projects | Name, Description | Weight A (High) |
| Tasks | Title, Description text, Identifier (`TASK-12`) | Weight A (High) |
| Wiki Pages | Title, Document Markdown content | Weight A (High) |
| Files | Filename, Tags | Weight B (Medium) |
| Comments | Comment body text | Weight C (Low) |
| Users | Name, Email | Weight B (Medium) |

---

## 12.3 Command Palette Integration

The global Command Palette (`⌘K`) queries `/api/v1/search?q=query` with debouncing (300ms):
- Results return categorized by module type with direct routing links.
- Supports keyboard navigation (Arrow Up/Down, Enter to select).
- Filters results via prefixes (e.g. `is:task`, `in:wiki`, `by:@user`).
