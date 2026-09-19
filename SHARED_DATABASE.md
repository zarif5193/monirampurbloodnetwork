# Shared database contract

- Both applications use PostgreSQL.
- Both applications use the same `src/db/schema.ts`.
- Both applications use the same `DATABASE_URL` environment variable.
- The admin project does not seed, truncate, or maintain a second database.
- Apply schema changes from the main project with `npm run db:push`.
- Never expose `DATABASE_URL` to browser/client code.
