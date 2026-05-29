# Samagama Internship Portal - Frontend

This is the React-based frontend application for the Samagama Internship Portal. It is built with Vite, TypeScript, and follows a feature-based architecture for scalability and maintainability.

## Project Overview

- **Main Technologies:** React 18, TypeScript, Vite, React Router 6, TanStack Query (React Query) v5, Axios, React Hook Form, Zod.
- **Architecture:** 
  - **Feature-Based:** Located in `src/features/`, each directory contains its own components, API clients, and React Query hooks (e.g., `api.ts`, `queries.ts`).
  - **Layouts:** Common application shells and navigation are in `src/layouts/`.
  - **UI Primitives:** Reusable, low-level components are in `src/components/ui/`.
  - **State Management:** TanStack Query handles server state, while standard React hooks and local state are used for UI state.
  - **API Layer:** A central Axios instance in `src/lib/api-client.ts` handles authentication headers and error normalization.

## Building and Running

Ensure you have Node.js installed. Then, use the following commands:

- **Development:** `npm run dev` starts the Vite development server (default port 5173).
- **Build:** `npm run build` runs TypeScript type checks and then builds the application for production.
- **Testing:**
  - `npm run test`: Runs Vitest test suites once.
  - `npm run test:watch`: Runs Vitest in watch mode.
- **Type Checking:** `npm run typecheck` runs `tsc` without emitting files.
- **Linting:** `npm run lint` runs ESLint across the `src` directory.

## Development Conventions

- **Feature Structure:** When adding a new feature, create a new directory in `src/features/`. Keep API logic in `api.ts` and React Query hooks in `queries.ts` within that directory.
- **Styling:** 
  - Use **Vanilla CSS** with CSS variables defined in `src/styles/globals.css`.
  - Prefer using the established design tokens (e.g., `--color-primary`, `--color-bg`).
  - For primitive UI components, inline styles or CSS modules are acceptable, though existing primitives in `src/components/ui/` often use inline styles for variant logic.
- **Type Safety:** Use TypeScript rigorously. Rely on `@samagama/shared` for domain models and Zod for runtime validation/form schemas.
- **Data Fetching:** Always use TanStack Query for server-side data fetching to ensure consistent caching and loading states.
- **Components:** Favor functional components and hooks. Use the primitive components in `src/components/ui/` for consistent design.
- **Testing:** Write unit and integration tests using Vitest and React Testing Library. Place tests in `__tests__` directories near the code they test.
