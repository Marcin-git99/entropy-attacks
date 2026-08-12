---
project: "Entropy Attacks"
context_type: greenfield
created: 2026-08-12
updated: 2026-08-12
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 2
  hard_deadline: 2026-08-26
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "moment of use"
      decision: "conference demo / booth — short, spectacular, readable over the shoulder"
    - topic: "audience reach"
      decision: "AI/security community via public link; individuals from many organizations"
    - topic: "teaching direction"
      decision: "the story teaches, the mechanics entertain"
    - topic: "access model"
      decision: "no sign-in; state stays on the player's device"
    - topic: "enemy variety"
      decision: "one enemy type only; the taxonomy of attack kinds is cut from the first version"
    - topic: "scoreboard scope"
      decision: "local to the device — a self-chosen nick and the best runs on this machine; nothing leaves the browser"
    - topic: "extras priority"
      decision: "if only one extra survives the second week, it is sound"
    - topic: "steering keys"
      decision: "numeric keypad matching the physical key layout — 8 up, 5 down, 4 left, 6 right"
    - topic: "rocket behaviour"
      decision: "homing; a fired rocket always hits, and wasting one early is the player's own loss"
    - topic: "wave size"
      decision: "a fixed pool of 12–15 threats per run, so 'destroy them all' has an end"
    - topic: "running out of ammunition"
      decision: "the run continues; the pilot watches entropy climb with nothing left to fire"
    - topic: "radar fidelity"
      decision: "coarse — direction and distance are approximate, not a faithful projection of the cockpit view"
    - topic: "energy gauge"
      decision: "a mirror of entropy, kept deliberately as cockpit furnishing and a second read of the same state"
    - topic: "cockpit damage"
      decision: "cracks start at half entropy and thicken; the canopy shatters at 100%"
    - topic: "in-flight messages"
      decision: "they interrupt combat too — their job is dread, not instruction"
    - topic: "domain rule"
      decision: "delay makes interception dearer; anything that gets through raises entropy permanently"
    - topic: "quality targets"
      decision: "60 fps, response under 50 ms, a run under three minutes, mainstream desktop browsers"
    - topic: "deadline"
      decision: "a fixed conference date, 2026-08-26, with the two-week budget ending on the same day"
  frs_drafted: 19
  quality_check_status: accepted
---

# Shape notes — Entropy Attacks

Seed input: `PRD.md` (design draft) + mockups `kokpit.jpg`, `star_attack_3.jpg`, `Entrop.jpg`.

## Vision & Problem Statement

The simulator must be playable first and educational second — both are required, neither alone is sufficient.

The setting is not decoration. Entropy creatures subvert civilizations by injecting code into operating systems (Indirect Prompt Injection), raising system entropy until it collapses in a storm of hallucinations. The audience — AI developers and AI DevOps engineers — is expected to recognise the reference and judge whether it holds up.

Teaching direction: **the story teaches, the mechanics entertain.** The knowledge lives in the narrative layer — briefings, incoming messages, the closing summary. The gameplay's job is to keep the player at the screen long enough for the narrative to land.

Teaching goals kept for the first version: the cost of detecting a threat late, and the economy of limited defensive resources. The taxonomy of attack kinds was considered and cut (see Non-Goals).

Moment of use: a conference demo / booth on 2026-08-26 — a short run, watched over the shoulder, readable at a glance.

> Tension recorded: at a booth nobody reads text screens, yet the story is the teaching vehicle. Partly answered in Phase 4 — in-flight messages carry dread rather than instruction, which moves the teaching weight onto the opening briefing and the closing summary. Those two screens are now load-bearing for the educational goal.

## User & Persona

Primary persona: an AI developer / AI DevOps engineer. Reached through a public link within the AI and security community; individuals from many different organizations, not one closed team. Because every copy of the game lives entirely in the player's own browser, the audience could grow a hundredfold without changing anything about how the game works.

## Success Criteria

### Primary

- A first-time player completes a whole run — win or lose — without anyone explaining the controls to them.
- The player starts a second run without being prompted to.
- After the run, the player can say in their own words what Indirect Prompt Injection is.
- The player destroys their first Entrop within 60 seconds of starting.

### Secondary

- Sound: alarms, cannon fire, explosions. Highest-priority extra — the one that survives if the second week runs short.
- A self-chosen nick and a table of the best runs on this device.
- A closing summary screen that connects what the player just did to the real-world threat.

### Guardrails

- The game runs smoothly in a browser on an ordinary work laptop, chosen by circumstance rather than by the team.
- The delay between a key press and the ship responding is imperceptible.
- A whole run fits within a few minutes.
- Nothing the player types or scores leaves their device.

## User Stories

### US-01: The pilot destroys an approaching threat

- **Given** a run in progress, with ammunition left and a threat closing on the centre
- **When** the pilot steers the ship until the threat sits inside the crosshair and fires the cannon
- **Then** the threat is destroyed, the tally of kills rises by one, and the entropy level does not move

#### Acceptance Criteria

- The crosshair signals that the target is inside it *before* the shot is fired, not after.
- A shot fired while the target is outside the crosshair spends ammunition and destroys nothing.
- The same threat may be fired at repeatedly while it approaches — a miss costs a round, not a life.

### US-02: A threat the pilot failed to stop reaches the centre

- **Given** a threat that was never destroyed on its way in
- **When** it reaches the centre
- **Then** entropy rises by 10%, the energy reading falls to match, and the run continues

#### Acceptance Criteria

- Past half entropy, each further infection leaves the canopy visibly more cracked than the last.
- At 100% entropy the canopy shatters and the run ends in defeat.
- Running out of ammunition does not end the run — the remaining threats arrive with nothing left to stop them.

## Functional Requirements

### Flying and fighting

- FR-001: The player can start a new run from the title screen. Priority: must-have
- FR-002: The player can steer the ship on two axes from the numeric keypad — 8 up, 5 down, 4 left, 6 right. Priority: must-have
- FR-003: The player can see approaching threats on the radar before they are visible through the canopy. Priority: must-have
  > Socratic: Counter-argument considered: "the radar duplicates the canopy view and forces two coordinate systems to stay in sync — expensive in a two-week budget." Resolution: kept, but coarse — direction and distance are approximate rather than a faithful projection. The narrative value and the distance-to-centre reading survive; the costly part does not.
- FR-004: The player can see a threat through the canopy, growing larger and harder to hold in the crosshair as it closes, with a mounting sense of speed as it flies past. Priority: must-have
- FR-005: The player can tell when a threat is inside the crosshair. Priority: must-have
- FR-006: The player can fire the laser cannon, which carries 16 rounds. Priority: must-have
- FR-007: The player can fire a homing rocket, which carries 3 and always hits. Priority: must-have
  > Socratic: Counter-argument considered: "a weapon that cannot miss demands no skill, so the optimal play is to spend all three in the first ten seconds." Resolution: stands as written — spending a rocket on an easy distant target is the player's own loss, and the bill arrives later. That is how a real defence budget behaves.
- FR-008: The player can see a destroyed threat explode. Priority: must-have
- FR-009: The player can see how much ammunition is left at any moment. Priority: must-have

### System state

- FR-010: The player can see the entropy level rise with each infection. Priority: must-have
- FR-011: The player can see the energy level. Priority: must-have
  > Socratic: Counter-argument considered: "energy falls exactly when entropy rises, so the second gauge carries no information the first one lacks." Resolution: accepted as true — it is a mirror, kept deliberately as cockpit furnishing and as a second, faster peripheral read of the same state. Only infections drain it, it never recovers, and zero energy is the same defeat as full entropy.
- FR-012: The player can win the run by destroying every threat in the wave. Priority: must-have
- FR-013: The player loses the run when entropy reaches 100%. Priority: must-have
- FR-014: The player can start another run immediately after one ends. Priority: must-have
- FR-019: The player can see the canopy crack — cracks appear past half entropy, thicken with each further infection, and the canopy shatters at 100%. Priority: must-have

### Story and score

- FR-015: The player receives incoming messages during the run, including mid-combat. Priority: must-have
  > Socratic: Counter-argument considered: "a player reading text is not watching the crosshair, so the story competes with the game instead of supporting it." Resolution: the messages carry dread rather than instruction, so ignoring one costs the player nothing. The counter-argument assumed an information channel; this is an atmosphere channel. Consequence recorded: the teaching weight moves to the opening briefing and the closing summary.
- FR-016: The player can enter a nick and see the best runs recorded on this device. Priority: nice-to-have
- FR-017: The player can hear alarms, cannon fire and explosions. Priority: nice-to-have — first among the extras if time runs short
- FR-018: The player can see a closing summary that ties the run to the real-world threat. Priority: nice-to-have

## Business Logic

The cost of stopping a threat grows with every moment of delay, and every threat that gets through raises the system's entropy permanently and irreversibly.

A threat costs one shot when it is intercepted far out. Left alone it grows in the canopy while escaping the crosshair faster than it grows as a target, so the same kill costs several shots later — or the rocket, of which there are three. A threat that is never stopped costs a tenth of the system's stability instead, and that tenth never comes back: the defence can only slow the collapse, never undo it. The player meets this rule as a running trade between spending a scarce shot now and paying a larger, permanent price later.

## Non-Functional Requirements

- The picture holds 60 frames per second for the whole run on an ordinary work laptop.
- The ship begins to respond to a key press within 50 ms of it being pressed.
- A whole run, from start to result, takes no longer than three minutes.
- The game remains playable in the latest two versions of the four mainstream desktop browsers. A keyboard is required.
- Nothing the player types or scores leaves their device.

## Access Control

Single player; no sign-in. The player types a nick of their choosing, which is kept on their own device and used only for the local table of best runs. No accounts, no shared scoreboard, no personal data collected.

## Non-Goals

Functional:

- One enemy type only — no taxonomy of different attack kinds with distinct behaviours, models and descriptions. Cut deliberately to protect the two-week budget.
- No shared or global scoreboard — the table stays on the device, which keeps the game a single static thing with no server behind it.
- No tutorial and no instructions screen — a first-time player must read the cockpit itself, which is exactly what the primary success criterion measures.
- No saving or resuming a run — closing the tab ends the mission for good. At three minutes a run, keeping state across visits buys nothing.

Non-functional:

- No photorealistic art — the flat black-outline style of the mockups is the target, and it is the single largest time saving in the project.
- One language only, no translations — the story carries the teaching, so translating it is a second act of writing rather than a swap of labels.
- No accommodation for players who cannot distinguish colours, even though red carries meaning throughout the cockpit — radar contacts, the lit crosshair, the entropy bar, the cracks. Excluded knowingly.
- No offline play — the game is fetched when the player arrives and is not expected to survive losing the network.

## Open Questions

1. **Exact wave size and ammunition balance** — 19 shots against 12–15 threats, with defeat at 10 infections. The numbers must be tuned so that both winning and losing are reachable. Owner: user, during implementation.
2. **The mockups contradict the entropy rule** — `kokpit.jpg` and `star_attack_3.jpg` show both gauges at 100%, which the mirror rule makes impossible. The opening state is energy full, entropy empty. Owner: user.
3. **Difficulty levels are deliberately left open** — not in scope, not ruled out either. Kept as a possible extra, for instance faster threats for someone taking a second turn at the booth. Owner: user, to settle if the second week leaves room.

## Forward: tech-stack

The seed draft named a specific set of frameworks, hosting, testing and linting tools, each followed by "or propose something more suitable". None of it is carried into the PRD — it is a question for the stack-selection step, not a product decision. Points worth handing over:

- The draft's own uncertainty about every listed choice is itself the signal: nothing here is settled.
- Hard constraints that a stack must satisfy come from the quality targets above: a steady 60 frames per second with a moving target, response under 50 ms, four mainstream desktop browsers, and no server of any kind behind the game.
- The whole product is a single static thing a player fetches once. That rules out a great deal and simplifies the rest.
