# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server

# Build
npm run build        # Production build
npm run build:dev    # Development build

# Lint
npm run lint         # ESLint

# Tests
npm test             # Run vitest unit tests (once)
npm run test:watch   # Run vitest in watch mode
npx playwright test  # Run Playwright e2e tests
```

To run a single vitest test file:
```bash
npx vitest run src/test/example.test.ts
```

## Architecture

This is **CardForge** — a browser-based TCG card designer. Users design card templates, populate them with spreadsheet data, and export/share the results.

### State Management (Zustand)

All application state lives in two Zustand stores — there is no server-side session or local database; projects exist only in memory and are persisted to GitHub via the backend.

- **`src/store/useProjectStore.ts`** — All card design state: projects, sheets, templates, elements, rows, and active selections. Template operations are scoped to `activeSheetId` + `activeFace` (front/back). The key helpers `mapActiveSheet` and `mapFaceTemplate` are used internally to scope mutations.
- **`src/store/useGitHubStore.ts`** — GitHub session token, authenticated user, repo list, and selected repo. Session token is persisted in `localStorage` under `cardforge_session_token`.

### Data Model (`src/types/card.ts`)

```
CardProject
  └── CardSheet[]           (tabs in the editor)
        ├── template: CardTemplate   (front face)
        ├── backTemplate?: CardTemplate  (optional back face)
        └── rows: CardRow[]          (spreadsheet data)

CardTemplate
  └── elements: CardElement[]  (positioned, typed design elements)

CardElement types: text | icon | image | hline | vline | svg
```

Template tags use `{{fieldName}}` syntax to bind elements to spreadsheet columns. The `visibleIfField` property on elements hides them when the referenced column is empty.

Elements can carry `tcgType` (schema class) and `tcgProperty` annotations from the TCG Schema vocabulary defined in `src/types/card.ts`.

### Routing (`src/App.tsx`)

- `/` — Main app: shows `ProjectDashboard` (no active project) or `CardEditor` (active project). GitHub OAuth callback is handled inline by `GitHubCallbackHandler`.
- `/p/:projectId` — `PublicCardSet`: read-only gallery of a public project's cards, rendered with HTML microdata annotations using the TCG Schema vocabulary.

### Backend API (`src/services/api.ts`, `src/services/github.ts`)

Base URL: `VITE_CARDFORGE_API_URL` env var, defaulting to `/api`.

- **Auth**: Server-side GitHub App OAuth. `initiateGitHubAuth` → redirect → `handleGitHubCallback` → session token.
- **Projects**: `saveProject` / `loadProject` — persist/retrieve full `CardProject` JSON to/from a GitHub repo.
- **Repos**: `listRepos` — list repos the user can push to.

### Export (`src/services/export.ts`)

- **JSON**: Direct browser download of project JSON.
- **ZIP**: JSZip bundle containing `project.json`, per-sheet `template.json`, `data.csv`, `data.json`, and one `card_N.html` per row.
- **PDF**: POSTs project JSON to `POST /api/projects/:id/export/pdf`, backend returns a PDF blob.

### UI Components

`src/components/ui/` contains shadcn/ui primitives (Radix UI + Tailwind). Do not modify these directly — regenerate via the shadcn CLI if needed.

Application-level components:
- `CardCanvas` — drag-to-position editor canvas; also exports `renderElement` used by the public view.
- `ElementPanel` — sidebar for adding/editing/styling elements on the active template face.
- `SpreadsheetPanel` — inline spreadsheet for `CardRow` data.
- `CardPreviewGrid` — renders all rows merged with the template as a preview grid.
- `GitHubPanel` / `GitHubAuthButton` / `GitHubCallbackHandler` — GitHub auth and repo push UI.
