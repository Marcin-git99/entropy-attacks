---
project: "Entropy Attacks"
version: 1
status: draft
created: 2026-08-12
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 2
  hard_deadline: 2026-08-26
  after_hours_only: true
---

# Entropy Attacks — Product Requirements

## Vision & Problem Statement

Entropy Attacks is a fighter-cockpit simulator shown at a conference booth on 2026-08-26 to AI developers and AI DevOps engineers. It must be playable first and educational second — both are required, neither alone is sufficient. A run is short, watched over the shoulder, and readable at a glance.

The setting is not decoration. Entropy creatures subvert civilizations by injecting code into operating systems — Indirect Prompt Injection — raising a system's entropy until it collapses in a storm of hallucinations. The audience is expected to recognise the reference and judge whether it holds up, which is why the story carries the teaching and the mechanics carry the entertainment: the gameplay's job is to keep a player at the screen long enough for the narrative to land. Two teaching goals are kept for the first version — the cost of detecting a threat late, and the economy of limited defensive resources.

## User & Persona

An AI developer or AI DevOps engineer, reached through a public link within the AI and security community. They are individuals from many different organizations rather than one closed team, and they arrive either at the booth itself or from a link passed around afterwards. They recognise the vocabulary of the setting and will judge whether the metaphor is earned.

Because every copy of the game lives entirely on the player's own machine, the audience could grow a hundredfold without changing anything about how the game works.

## Success Criteria

### Primary

- A first-time player completes a whole run — win or lose — without anyone explaining the controls to them.
- The player starts a second run without being prompted to.
- After the run, the player can say in their own words what Indirect Prompt Injection is.
- The player destroys their first threat within 60 seconds of starting.

### Secondary

- Sound: alarms, cannon fire, explosions. The highest-priority extra — the one that survives if the second week runs short.
- A self-chosen nick and a table of the best runs recorded where the player is playing.
- A closing summary that connects what the player just did to the real-world threat.

### Guardrails

- The game runs smoothly on an ordinary work laptop, chosen by circumstance rather than by the team.
- The delay between a key press and the ship responding is imperceptible.
- A whole run fits within a few minutes.
- Nothing the player types or scores leaves their own machine.

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
  > Rationale: 4, 5 and 6 share a row with 8 directly above 5, so the four keys form the inverted T that arrow keys and WASD have trained players to expect. A layout that puts down a row lower breaks the hand position, which matters when a first-time player has to work the controls out unaided.
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
- FR-016: The player can enter a nick and see the best runs recorded where they are playing. Priority: nice-to-have
- FR-017: The player can hear alarms, cannon fire and explosions. Priority: nice-to-have — first among the extras if time runs short
- FR-018: The player can see a closing summary that ties the run to the real-world threat. Priority: nice-to-have

## Non-Functional Requirements

- The picture holds 60 frames per second for the whole run on an ordinary work laptop.
- The ship begins to respond to a key press within 50 ms of it being pressed.
- A whole run, from start to result, takes no longer than three minutes.
- The game remains playable on the latest two major versions of the four mainstream desktop browsers. A keyboard is required.
- Nothing the player types or scores leaves their own machine.

## Business Logic

The cost of stopping a threat grows with every moment of delay, and every threat that gets through raises the system's entropy permanently and irreversibly.

A threat costs one shot when it is intercepted far out. Left alone it grows in the canopy while escaping the crosshair faster than it grows as a target, so the same kill costs several shots later — or the rocket, of which there are three. A threat that is never stopped costs a tenth of the system's stability instead, and that tenth never comes back: the defence can only slow the collapse, never undo it.

The player meets this rule as a running trade between spending a scarce shot now and paying a larger, permanent price later. Nineteen shots stand against a wave of twelve to fifteen threats, and ten threats reaching the centre end the run in defeat.

## Access Control

Single player; no sign-in. The player types a nick of their choosing, which stays with them and is used only for the local table of best runs. No accounts, no shared scoreboard, no personal data collected.

## Non-Goals

Functional:

- One enemy type only — no taxonomy of different attack kinds with distinct behaviours, models and descriptions. Cut deliberately to protect the two-week budget.
- No shared or global scoreboard — every player's table stays with them.
- No tutorial and no instructions screen — a first-time player must read the cockpit itself, which is exactly what the primary success criterion measures.
- No saving or resuming a run — leaving the game ends the mission for good. At three minutes a run, carrying state across visits buys nothing.

Non-functional:

- No photorealistic art — a flat, black-outline style is the target, and it is the single largest time saving in the project.
- One language only, no translations — the story carries the teaching, so translating it is a second act of writing rather than a swap of labels.
- No accommodation for players who cannot distinguish colours, even though red carries meaning throughout the cockpit — radar contacts, the lit crosshair, the entropy bar, the cracks. Excluded knowingly.
- No offline play — the game is fetched when the player arrives and is not expected to survive losing the network.

## Open Questions

1. **Exact wave size and ammunition balance** — 19 shots against 12–15 threats, with defeat at 10 infections. The numbers must be tuned so that both winning and losing are reachable. Owner: user, during implementation.
2. **The mockups contradict the entropy rule** — the cockpit mockups show both gauges at 100%, which the mirror rule makes impossible. The opening state is energy full, entropy empty. Owner: user.
3. **Difficulty levels are deliberately left open** — not in scope, not ruled out either. Kept as a possible extra, for instance faster threats for someone taking a second turn at the booth. Owner: user, to settle if the second week leaves room.
4. **The teaching goal rests on two nice-to-have surfaces** — with in-flight messages carrying dread rather than instruction, the educational weight falls on the opening briefing and the closing summary. The closing summary is currently a nice-to-have ranked below sound. If it is cut, the third primary success criterion — that a player can explain Indirect Prompt Injection afterwards — has nothing left to carry it. Owner: user, before the second week.
