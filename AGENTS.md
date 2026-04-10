# AGENTS.md

Guidance for coding agents working in this repository.

## Project Snapshot
- Stack: Next.js 16 (App Router), React 19, TypeScript 5, Prisma, PostgreSQL, Tailwind CSS v4.
- Package manager: npm (`package-lock.json` present).
- Runtime: Node.js LTS compatible with Next.js 16.
- Source root: `src/`.
- API routes: `src/app/api/**/route.ts`.
- Prisma schema: `prisma/schema.prisma`.
- Docker services: PostgreSQL in `docker-compose.yml`.

## Repository Rules Files
- `.cursorrules`: not present.
- `.cursor/rules/`: not present.
- `.github/copilot-instructions.md`: not present.
- If any of these appear later, treat them as higher-priority instructions.

## Install and Local Setup
1. Install dependencies: `npm install`
2. Create `.env` with at least:
   - `DATABASE_URL=postgresql://orion_admin:orion_password@localhost:5432/orion_db?schema=public`
   - `JWT_SECRET=<your-secret>`
3. Start PostgreSQL: `docker compose up -d`
4. Run migrations: `npx prisma migrate dev --name init`
5. Start app: `npm run dev`

## Build, Lint, Typecheck, Test Commands

### Core Commands
- Dev server: `npm run dev`
- Production build: `npm run build`
- Start production build: `npm run start`
- Lint all files: `npm run lint`

### Useful One-off Commands
- Type-check only: `npx tsc --noEmit`
- Lint one file: `npx eslint src/app/api/projects/route.ts`
- Lint one folder: `npx eslint src/components`
- Prisma generate: `npx prisma generate`
- Prisma Studio: `npx prisma studio`

### Tests (Current State)
- No test runner is configured in `package.json`.
- No `test` script exists.
- No `*.test.*` or `*.spec.*` files were found.
- Full test command: not available.
- Single test command: not available.

### If You Add a Test Runner
- Preferred runner: Vitest.
- Suggested scripts:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
- Typical full suite command: `npm run test`
- Typical single-file command: `npx vitest run src/path/to/file.test.ts`
- Typical single-test command: `npx vitest run src/path/to/file.test.ts -t "test name"`

## Architecture and Organization
- Next.js App Router under `src/app`.
- Route groups currently used: `(auth)` and `(dashboard)`.
- API handlers live in segment-local `route.ts` files.
- Shared utilities in `src/lib`.
- Reusable UI components in `src/components`.
- Keep Prisma access centralized in `src/lib/prisma.ts`.

## Import Conventions
- Use the path alias when practical: `@/* -> ./*`.
- Existing convention: `import prisma from "@/src/lib/prisma"`.
- Import order:
  1) framework/external packages
  2) internal absolute imports (`@/...`)
  3) relative imports
- Keep imports alphabetized within each group when reasonable.

## TypeScript Guidelines
- `strict` mode is enabled; keep code strict-safe.
- Avoid `any`; prefer explicit interfaces, aliases, and generics.
- If `any` is unavoidable, keep it narrowly scoped.
- Use `unknown` for caught errors and narrow before use.
- Type component props explicitly (`interface` or `type`).
- Prefer explicit return types for exported shared utilities.
- Avoid unnecessary type assertions.

## Naming Conventions
- Components: `PascalCase` (`ProjectSidebar.tsx`).
- Hooks/functions/variables: `camelCase`.
- True constants: `UPPER_SNAKE_CASE`.
- Files:
  - Components: `PascalCase.tsx`
  - Utility modules: `kebab-case.ts`
  - Next route handlers: `route.ts`
- Preserve existing Prisma model/enum naming conventions.

## Formatting and Style
- Follow `eslint.config.mjs` (Next core-web-vitals + TypeScript rules).
- Match existing style in the file you edit.
- In TS/TSX, prefer double quotes, semicolons, and trailing commas in multiline literals.
- Keep functions focused and relatively small.
- Add comments only for non-obvious intent.
- Keep user-facing copy consistent with current app language (mostly Spanish).

## React / Next.js Practices
- Add `"use client"` only when client features are required.
- Default to Server Components for non-interactive views.
- Validate request payloads before DB writes.
- Keep handlers idempotent where practical.
- In server code, prefer direct DB/util access over calling internal API routes.

## API and Error Handling
- Return JSON via `NextResponse.json(...)` with explicit status codes.
- Use a stable error shape like `{ error: string }`.
- Validate required params early and return `400` on invalid input.
- Use `401` for auth failures, `404` for missing resources, `500` for unexpected errors.
- Do not leak stack traces/secrets in responses.
- Log actionable server errors for debugging.

## Prisma and Database
- Always import Prisma client from `@/src/lib/prisma`.
- Use narrow `select`/`include` payloads.
- Use transactions for multi-step writes that must be atomic.
- Respect schema `@map` names and enum constraints.
- On schema change:
  - update `prisma/schema.prisma`
  - run `npx prisma migrate dev --name <change>`
  - run `npx prisma generate`

## Security and Auth
- Auth session cookie: `orion_session`.
- Never hardcode production secrets.
- `process.env.JWT_SECRET` must be set outside local-only development.
- Preserve route protection behavior in `src/proxy.tsx`.
- Avoid introducing unauthenticated data access in API routes.

## UI and Styling
- Tailwind v4 utilities/tokens live in `src/app/globals.css`.
- Reuse shared utility classes (for example `btn-primary`, `input-orion`, `page-container`).
- Preserve current design tokens and class naming patterns.
- Keep responsive behavior intact on desktop and mobile.

## Agent Workflow Expectations
- Keep edits minimal, targeted, and architecture-consistent.
- Do not modify unrelated files.
- For substantial changes, run at least `npm run lint` and `npm run build`.
- If you skip commands (time/cost/env), report exactly what was not run and why.
- If you introduce new conventions or tools, update this file in the same change.
