---
bootstrapped_at: 2026-08-12T18:44:56Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: entropy-attacks
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

Verbatim from `context/foundation/tech-stack.md`:

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: entropy-attacks
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: false
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

### Why this stack (from the hand-off body)

A solo developer shipping a browser cockpit game in two weeks of after-hours work, against a hard conference date, took the standard path: `10x-astro-starter` is the recommended default for `(web, js)` and clears all four agent-friendly gates, so no time goes into assembling a stack by hand. What the project actually consumes from the card is narrow — TypeScript, Tailwind, Vite-based build, and static output to Cloudflare Pages, which is enough because the PRD rules out a server entirely: no sign-in, no shared scoreboard, nothing leaving the player's machine, so every feature flag is false. Supabase, auth scaffolding, and Astro's API routes ship with the starter and are dead weight here; they are cheap to leave unwired but should be stripped rather than half-configured. The load-bearing technical decision — the rendering approach behind the 60 fps and sub-50 ms input requirements, and the nick and high-score table backed by local browser storage — sits above this starter and is not settled by it. Bootstrapper confidence is first-class rather than verified, so expect the occasional manual step during scaffolding.

## Pre-scaffold verification

| Signal      | Value                                                        | Severity | Notes                                                          |
| ----------- | ------------------------------------------------------------ | -------- | -------------------------------------------------------------- |
| npm package | not run                                                      | n/a      | `cmd_template` starts with `git clone`; no npm CLI to resolve    |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-05-17    | fresh    | from `card.docs_url`; 2 months 26 days old, 5 days inside the 3-month freshness threshold |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 19 top-level entries (`.env.example`, `.github`, `.gitignore`, `.husky`, `.nvmrc`, `.prettierrc.json`, `.vscode`, `astro.config.mjs`, `components.json`, `eslint.config.js`, `node_modules`, `package-lock.json`, `package.json`, `public`, `README.md`, `src`, `supabase`, `tsconfig.json`, `wrangler.jsonc`)
**Conflicts (.scaffold siblings)**: CLAUDE.md → `CLAUDE.md.scaffold`
**.gitignore handling**: moved silently (absent in cwd)
**.bootstrap-scaffold cleanup**: deleted
**Upstream .git/ removal**: `.bootstrap-scaffold/.git/` deleted before move-up; the project carries no inherited history and no upstream remote
**Install output**: 773 packages added, 774 audited, ~2 min

### Environment note

`npm install` emitted:

```
Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0'
makes TLS connections and HTTPS requests insecure by disabling certificate verification.
```

This is a pre-existing setting in the user's environment, not something bootstrapper set. It means all 773 packages were fetched over connections whose TLS certificates were not verified. Recorded here because it is a supply-chain-relevant condition of this specific install, and because it is invisible once the terminal scrollback is gone.

## Post-scaffold audit

**Tool**: `npm audit --json`
**Exit code**: 1 (informational — npm audit exits non-zero whenever findings exist; not treated as a halt)
**Summary**: 1 CRITICAL, 13 HIGH, 7 MODERATE, 2 LOW (23 total)
**Direct vs transitive**: 3 direct of 23 total — 0/1/2/0 direct across CRITICAL/HIGH/MODERATE/LOW. Dependency counts: 765 total (449 prod, 316 dev).
**Fix availability**: every one of the 23 findings reports `fixAvailable: true`.

#### CRITICAL findings

- **tar** (transitive) — node-tar applies PAX size override to intermediary GNU long-name/long-link headers, causing a tar parser interpretation differential (file smuggling). Reaches the tree through `supabase`. Fix available.

#### HIGH findings

- **astro** (DIRECT) — Reflected XSS via unescaped slot name. The only direct high-severity finding; actionable immediately by bumping the Astro version. Fix available.
- **brace-expansion** (transitive) — DoS via exponential-time expansion of consecutive non-expanding `{}` groups.
- **devalue** (transitive) — DoS via sparse array deserialization.
- **fast-uri** (transitive) — host confusion via literal backslash authority delimiter.
- **js-yaml** (transitive) — quadratic-complexity DoS in merge key handling via repeated aliases.
- **miniflare** (transitive) — inherited via `sharp`.
- **nanoid** (transitive) — non-secure generators can loop indefinitely with negative size.
- **postcss** (transitive) — path traversal in previous-source-map auto-loading (`sourceMappingURL`), leading to arbitrary `.map` file disclosure.
- **sharp** (transitive) — inherited libvips vulnerabilities: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591.
- **svgo** (transitive) — `removeScripts` plugin leaves some executable scripts intact.
- **undici** (transitive) — TLS certificate validation bypass via dropped `requestTls` in SOCKS5 ProxyAgent.
- **vite** (transitive) — `launch-editor`: NTLMv2 hash disclosure via UNC path handling on Windows.
- **ws** (transitive) — uninitialized memory disclosure.

#### MODERATE findings

- **supabase** (DIRECT) — reaches `tar`.
- **wrangler** (DIRECT) — reaches `esbuild`.
- **@astrojs/language-server** (transitive) — via `volar-service-yaml`.
- **@cloudflare/vite-plugin** (transitive) — via `miniflare`.
- **volar-service-yaml** (transitive) — via `yaml-language-server`.
- **yaml** (transitive) — stack overflow via deeply nested YAML collections.
- **yaml-language-server** (transitive) — via `yaml`.

#### LOW / INFO findings

- **@babel/core** (transitive) — arbitrary file read via `sourceMappingURL` comment.
- **esbuild** (transitive) — arbitrary file read when running the development server on Windows.

### Reading of these findings for this project

Most of the tree is build- and deploy-time tooling rather than shipped code. This project produces a static bundle that runs entirely in the player's browser, with no server, no user accounts and no data leaving the machine, so findings in `wrangler`, `miniflare`, `sharp`, `esbuild` and the language-server chain describe the developer's own machine and CI, not the game as delivered to a player. Two exceptions deserve attention on their own terms: the direct `astro` XSS advisory, because Astro renders the pages that ship; and the `vite` / `esbuild` dev-server file-read and NTLM advisories, which are specifically Windows-and-dev-server issues and this project is developed on Windows.

Bootstrapper does not patch. `npm audit fix` is the user's call.

## Hints recorded but not acted on

| Hint                    | Value               |
| ----------------------- | ------------------- |
| bootstrapper_confidence | first-class         |
| quality_override        | false               |
| path_taken              | standard            |
| self_check_answers      | null                |
| team_size               | solo                |
| deployment_target       | cloudflare-pages    |
| ci_provider             | github-actions      |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | false               |
| has_payments            | false               |
| has_realtime            | false               |
| has_ai                  | false               |
| has_background_jobs     | false               |

No CI workflow was generated from `ci_provider` / `ci_default_flow`, and no deployment configuration was derived from `deployment_target`; v1 records these and takes no action. Note that the starter ships its own `.github/` directory, which was moved into place by the scaffold — that content comes from the starter, not from these hints.

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep. Here: `CLAUDE.md.scaffold` holds the starter's agent instructions; `CLAUDE.md` holds the project's own rules. They are different documents and may be worth merging rather than choosing between.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
- Decide what to do with the `supabase/` directory and the Supabase client dependencies: the hand-off records every feature flag as false, so nothing in the PRD uses them.
