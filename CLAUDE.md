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

### GitHub as backend

There is **no application backend in the data path**. The user signs in with
GitHub **OAuth Authorization-Code + PKCE** (redirect to GitHub → `/auth/callback`);
the browser then holds the user's own access token and talks to `api.github.com`
directly. Persistence layout (mirrors openhistorymap/archaeo-pro):

- **One private repo per project**: `cardforge-<projectId>`, description
  `cardforge — <name>` — `project.json`, per-sheet `template.json` / `data.csv` /
  `data.json` / `card_N.html`, `images/<hash>.<ext>` (uploaded images as real
  files), and `cards.jsonld` when annotated.
- **One private index repo**: `cardforge-index` with `index.json` + `index.csv`
  listing every project, so any device discovers them after login.
- **Assets**: `CardProject.assets` (filename → image) is written to `assets/<name>`
  in the repo; reference an asset by filename from a spreadsheet column and bind
  an image element to `{{column}}` for per-card art (managed in the Assets tab).
- **Auto-save**: once signed in, edits auto-commit to the project repo
  (debounced, serialised — `src/store/autosave.ts`); the header shows the status
  and a manual "Save to GitHub" remains in the GitHub panel.
- **Templates** (`src/services/templates.ts`): New Project → "Start from" offers
  built-in starters (`src/lib/cardPresets.ts`, offline fallback), a **global**
  public library (`openfantasymap/cardforge-templates` `index.json`, fetched
  unauthenticated), and **personal** templates (`cardforge-index/templates/*.json`).
  "Save as template…" (Export menu) writes the active layout to the personal set.

The only server (`ccc-server`, `VITE_CARDFORGE_API_URL`) is a **stateless proxy**
for the two things a browser can't do alone: the OAuth token exchange (CORS shim
that injects the client secret — GitHub requires it even with PKCE) and optional
remote PDF rendering. The client id (`VITE_GITHUB_CLIENT_ID`) is public.

### State Management (Zustand)

Projects exist only in memory and are persisted to GitHub on demand.

- **`src/store/useProjectStore.ts`** — All card design state: projects, sheets, templates, elements, rows, and active selections. Template operations are scoped to `activeSheetId` + `activeFace` (front/back). `upsertProject` adds-or-replaces a project (used when loading from GitHub). The key helpers `mapActiveSheet` and `mapFaceTemplate` are used internally to scope mutations.
- **`src/store/useGitHubStore.ts`** — The user's GitHub access **token** + authenticated user. Token is persisted in `localStorage` under `cardforge_gh_token`.

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

`icon` elements render an icon-font glyph (`<i class="<value>">`) chosen by the
element's value, so a bound `{{column}}` gives per-card icons. Font Awesome +
RPG-Awesome are built in; more can be added via `CardProject.iconStylesheets`.
See [docs/icons.md](docs/icons.md).

Template tags use `{{fieldName}}` syntax to bind elements to spreadsheet columns. The `visibleIfField` property on elements hides them when the referenced column is empty.

Elements can carry `tcgType` (schema class) and `tcgProperty` annotations from the TCG Schema vocabulary defined in `src/types/card.ts`.

### Routing (`src/App.tsx`)

- `/` — Main app: shows `ProjectDashboard` (no active project) or `CardEditor` (active project).
- `/auth/callback` — `AuthCallback`: exchanges the OAuth `?code` for a token (via the proxy relay), stores the session, and returns to where login started.
- `/p/:slug` — `PublicCardSet`: read-only gallery of a public project's cards, rendered with HTML microdata annotations using the TCG Schema vocabulary.

### Services (`src/services/`)

Base proxy URL: `VITE_CARDFORGE_API_URL` env var, defaulting to `/api`.

- **`githubAuth.ts`** — PKCE Authorization-Code login: `login()` builds the PKCE challenge/state and redirects to GitHub; `completeLogin(code, state)` validates state and relays the code to the proxy's `/auth/github/exchange` for a token.
- **`githubApi.ts`** — direct GitHub REST + Git Data API: `getUser`, `ensureRepo` (create private + auto-init), `commitFiles` (atomic blob→tree→commit→ref), `getFile`/`getFileText`, base64/binary helpers.
- **`assets.ts`** — `extractAssets` pulls embedded `data:` images out into `images/<sha1>.<ext>` and rewrites refs to relative paths; `inlineAssets` does the reverse on load (fetches files, rebuilds data URLs) so private repos render.
- **`cardFiles.ts`** — pure builders (`buildProjectTextFiles`, `buildCardHtml`, `cardInnerHtml`, `buildCsv`, `buildJsonLd`) shared by the repo writer and the ZIP/PDF exporters.
- **`projects.ts`** — orchestration: `saveProject` (extract assets → commit to `cardforge-<projectId>` → upsert index keyed by id), `loadProject` (read + inline assets), and index helpers (`listProjects`, `readIndex`, `upsertIndexEntry`).

### Export (`src/services/export.ts`)

- **JSON**: Direct browser download of project JSON.
- **ZIP**: JSZip bundle built from `buildProjectTextFiles` (mirrors the repo layout; images stay inline as data URLs).
- **PDF (local)**: `exportProjectPdfLocal` opens a self-contained print window (all cards, images inlined) → "Save as PDF". Fully client-side.
- **PDF (remote)**: `exportProjectPdfRemote` POSTs to the proxy's `/render/pdf` (WeasyPrint) for high-fidelity output.

### UI Components

`src/components/ui/` contains shadcn/ui primitives (Radix UI + Tailwind). Do not modify these directly — regenerate via the shadcn CLI if needed.

Application-level components:
- `CardCanvas` — drag-to-position editor canvas; also exports `renderElement` used by the public view.
- `ElementPanel` — sidebar for adding/editing/styling elements on the active template face.
- `SpreadsheetPanel` — inline spreadsheet for `CardRow` data.
- `CardPreviewGrid` — renders all rows merged with the template as a preview grid.
- `GitHubAuthButton` — sign-in (redirects to GitHub via `login()`) / sign-out.
- `GitHubPanel` — save the active project to its `cardforge-<projectId>` repo and reload it from GitHub.
- `ProjectDashboard` — lists local projects plus projects discovered in the `cardforge-index` repo; opening a remote one loads it via `loadProject`.
