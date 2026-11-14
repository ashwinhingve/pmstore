# Repository Guidelines

## Project Structure & Module Organization
PMStore is a pharmacy storefront built with Next.js 16 App Router, React, TypeScript, and MongoDB/Mongoose.
- `src/app/`: storefront, account, admin pages, and API route handlers.
- `src/components/`: feature components and shared UI; `src/styles/tokens.css` defines design tokens.
- `src/lib/`: pharmacy logic, checkout, inventory, integrations, and Zod validations.
- `src/models/`, `src/store/`, `src/hooks/`: Mongoose schemas, Zustand state, and React hooks.
- Tests live beside modules and in `src/__tests__/`; static assets live in `public/`.
- `mobile/` contains the Capacitor Android wrapper; `scripts/`, `templates/`, and `docs/` contain tooling, import templates, and specifications.

## Build, Test, and Development Commands
Use Node.js 20 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, and follow `SETUP.md` for configuration.
- `npm run dev`: start development at `localhost:3000`.
- `npm run build` / `npm run start`: build and serve production.
- `npm run lint` / `npm run typecheck`: check ESLint rules and TypeScript types.
- `npm run check:tokens`: detect hardcoded palette colors.
- `npm test` / `npm run test:watch`: run Vitest once or interactively.
- `npm run test:coverage`: collect V8 coverage.
CI requires typechecking, token checks, tests, and a production build.

## Coding Style & Naming Conventions
Use strict TypeScript, two-space indentation, semicolons, and existing local quote style. Prefer `unknown` with narrowing over `any`. Use `PascalCase.tsx` for components and kebab-case for new utility files. Import source modules through `@/`. Default to Server Components; add `'use client'` only for browser interactions. Use design tokens for colors. ESLint uses Next.js Core Web Vitals rules.

## Testing Guidelines
Name tests `*.test.ts` under `src/`. Vitest runs in Node; use `mongodb-memory-server` for database integration tests. Prioritize pricing, prescription enforcement, authorization, payments, and stock integrity. Documentation targets 100% coverage for pharmacy utilities and GST; configuration currently enforces no numeric threshold.

## Commit & Pull Request Guidelines
Follow history's `feat(scope): description`, `fix(scope): description`, and `docs(scope): description` pattern. Keep commits focused. PRs should explain behavior changes, link relevant issues, report validation, and include screenshots for UI changes.

## Security & Domain Rules
Keep secrets and patient data out of client code and logs. Compare medicines by `unitPrice`; preserve derived product fields when writing. Enforce prescriptions server-side and re-read database roles for destructive admin actions.
