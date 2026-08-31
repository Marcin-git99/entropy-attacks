# Entropy Attacks

A browser fighter-cockpit game shown at a conference booth. The player defends against Entropy
creatures — a dramatization of Indirect Prompt Injection — using a radar, a laser cannon and a
homing rocket, all played entirely on the numeric keypad.

**[Play it live](https://entropy-attacks.turolmar1-775.workers.dev)**

Product requirements live in [`context/foundation/prd.md`](context/foundation/prd.md); project
conventions and constraints live in [`CLAUDE.md`](CLAUDE.md).

## Tech Stack

- [Astro](https://astro.build/) v6 - server-first rendering, `output: "server"`
- [React](https://react.dev/) v19 - interactive islands
- [TypeScript](https://www.typescriptlang.org/) v5
- [Tailwind CSS](https://tailwindcss.com/) v4 with [shadcn/ui](https://ui.shadcn.com/) ("new-york" variant)
- [Cloudflare Pages](https://pages.cloudflare.com/) via `@astrojs/cloudflare`

No accounts, no server-side player data, no environment variables — everything the player types or
scores stays in their browser's local storage.

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

```bash
git clone https://github.com/Marcin-git99/entropy-attacks.git
cd entropy-attacks
npm install
npm run dev
```

## Controls

Numeric keypad only: **8** up, **5** down, **4** left, **6** right. **Space** fires the cannon,
**Numpad0** fires the homing rocket.

## Available Scripts

- `npm run dev` - development server (Cloudflare workerd runtime)
- `npm run build` - production build
- `npm run preview` - preview the production build
- `npm run lint` / `npm run lint:fix` - ESLint with type-checked rules
- `npm run format` - Prettier

## Project Structure

```md
.
├── src/
│ ├── game/        # Game loop, state and canvas rendering
│ ├── layouts/      # Astro layouts
│ ├── pages/        # Astro pages
│ ├── components/   # UI components (Astro & React)
│ └── lib/          # Services and helpers
├── public/          # Public assets
├── context/         # PRD and project foundation docs
├── wrangler.jsonc   # Cloudflare Pages config
```

## Deployment

```bash
npm run build
npx wrangler deploy
```

## CI

GitHub Actions runs lint + build on every push and PR to `master`.
