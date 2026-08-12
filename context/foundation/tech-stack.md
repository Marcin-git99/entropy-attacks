---
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
---

## Why this stack

A solo developer shipping a browser cockpit game in two weeks of after-hours work, against a hard conference date, took the standard path: `10x-astro-starter` is the recommended default for `(web, js)` and clears all four agent-friendly gates, so no time goes into assembling a stack by hand. What the project actually consumes from the card is narrow — TypeScript, Tailwind, Vite-based build, and static output to Cloudflare Pages, which is enough because the PRD rules out a server entirely: no sign-in, no shared scoreboard, nothing leaving the player's machine, so every feature flag is false. Supabase, auth scaffolding, and Astro's API routes ship with the starter and are dead weight here; they are cheap to leave unwired but should be stripped rather than half-configured. The load-bearing technical decision — the rendering approach behind the 60 fps and sub-50 ms input requirements, and the nick and high-score table backed by local browser storage — sits above this starter and is not settled by it. Bootstrapper confidence is first-class rather than verified, so expect the occasional manual step during scaffolding.
