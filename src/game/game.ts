import { createInput, type Controls, type SteerInput } from "./input";
import { QUESTIONS } from "./questions";
import { drawCockpit } from "./render";

export interface Threat {
  /**
   * Lateral offset from the ship's flight path, in world units. Constant while the threat closes —
   * the threat holds its course and the ship is what has to be aimed.
   */
  x: number;
  y: number;
  /** Distance ahead of the ship, counting down as the threat closes. */
  z: number;
}

/** A destroyed threat, held on screen for a moment where it died. FR-008. */
export interface Burst {
  x: number;
  y: number;
  z: number;
  /** Seconds since the kill; drives the expansion and ends the burst. */
  age: number;
}

/**
 * The run's lifecycle. "intro" is the story briefing, shown once before the player has ever
 * launched — it carries teaching weight the in-flight messages deliberately don't (see FR-015's
 * rationale), so it is not a tutorial and is never shown again after the first launch. "title" is
 * the pre-launch resting state proper. Clearing the wave in the cockpit ("wave-cleared") no longer
 * ends the game — it leads into "repair", Level 2's server-repair minigame, which settles into
 * "repaired" (the whole game won) or "corrupted" (Level 2's own failure state). "lost" is Level 1's
 * failure state and, like "repaired"/"corrupted", ends the whole game. The same fire key that
 * advances "intro" and "wave-cleared" also restarts a fresh run — at Level 1 — from any end state.
 */
export type Phase = "intro" | "title" | "playing" | "wave-cleared" | "lost" | "repair" | "repaired" | "corrupted";

export interface GameState {
  phase: Phase;
  /** How far the view has panned from dead ahead, in canopy half-heights. */
  view: { x: number; y: number };
  /** Null while a burst is playing — the threat is gone and the next one has not entered yet. */
  threat: Threat | null;
  burst: Burst | null;
  ammo: { cannon: number; rocket: number };
  /**
   * FR-010/FR-013, 0-100. Rises only, never resets mid-run — "the defence can only slow the
   * collapse, never undo it." Energy (FR-011) is the mirror the PRD asks for; it is not stored
   * separately, `render.ts` reads it as `100 - entropy` so the two readings can never drift apart.
   */
  entropy: number;
  /**
   * FR-012: how many of the wave's threats have been settled — destroyed or passed, either counts.
   * The wave clears (leading to Level 2) once this reaches WAVE_SIZE without the run having been
   * lost first.
   */
  resolved: number;
  /** FR-005: whether the threat sits inside the crosshair right now. Recomputed every frame. */
  locked: boolean;
  /** Seconds left on the cannon tracer, so a miss is visible and not just a number going down. */
  flash: number;
  fps: number;
  /** Level 2 state. Null until the player clears Level 1 and enters "repair". */
  repair: RepairState | null;
}

/**
 * Level 2: a bank of QUESTIONS.length questions, drawn without repeats. `correct` reaching
 * WIN_TARGET first wins the whole game; `mistakes` reaching MISTAKE_LOSE first ends it in defeat.
 * The pool is sized so a decision is always reached before it runs out — see WIN_TARGET's comment.
 */
export interface RepairState {
  /** Remaining question indices, shuffled once at the start of Level 2. */
  queue: number[];
  /** Index into QUESTIONS of the question currently on screen, or null while feedback is showing. */
  question: number | null;
  correct: number;
  mistakes: number;
  /** Set the instant an answer is submitted; drives a brief flash before the next question. */
  feedback: "correct" | "wrong" | null;
  /** Seconds left on that flash. */
  feedbackTime: number;
}

/**
 * Canopy half-heights per second. Bearing grows as offset/z, so a wide-entry threat's bearing
 * outruns a slow pan: at 0.9 (the original tuning), anything spawning past bearing ~0.8 was already
 * unreachable by the crosshair even for a player who reacted instantly, because the closing threat's
 * bearing grows faster than the view could catch up. Raised to close most of that gap — the widest
 * entries still need a rocket, not a faster pan, but the common case should be catchable by steering.
 */
const PAN_SPEED = 1.6;
/**
 * How far off dead ahead the ship can look before the canopy frame stops it, in canopy half-heights.
 *
 * Must stay under 1 — a bearing of exactly 1 is already the canopy's own top/bottom edge (`unit` in
 * render.ts is defined as half the canopy height, so that is a fixed property of the projection, not
 * a tuning number). Panning past that would let the crosshair aim somewhere the canopy can never draw,
 * which silently breaks something worse than "hard to hit": a *different* threat sitting near dead
 * ahead can scroll off the far edge and disappear while the view is pinned at the limit chasing
 * something else, with no way to tell it was ever there. 0.85 leaves comfortable margin.
 */
const PAN_LIMIT = 0.85;

/**
 * Maps held keys to view movement. This is the direct model: a key press moves the view this frame,
 * and releasing it stops the view dead. It satisfies the PRD's 50 ms response budget trivially,
 * at the cost of feeling weightless — there is no sense of a heavy fighter being hauled around.
 *
 * The alternative — an acceleration model with inertia — was considered and rejected: it reads as
 * mass, but spends part of the response budget ramping up. This is a settled game-feel decision;
 * do not switch models without asking.
 */
export function applySteering(view: GameState["view"], input: SteerInput, dt: number): void {
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  view.x = clamp(view.x + dx * PAN_SPEED * dt, -PAN_LIMIT, PAN_LIMIT);
  view.y = clamp(view.y + dy * PAN_SPEED * dt, -PAN_LIMIT, PAN_LIMIT);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** World units per second. From the original tuning (2): +50% → 3, -30% → 2.1, +20% → 2.52. Per the user's requests, in order. */
const THREAT_SPEED = 2.52;
/** Where a threat enters, far enough out to be a speck in the canopy. Exported for the radar's distance ring. */
export const THREAT_SPAWN_Z = 10;
/** The ship's plane. Below this the threat has passed — US-02's "reaches the centre". Also the radar's centre. */
export const THREAT_PASS_Z = 0.4;
/**
 * How far left/right of the flight path a threat can be and still be worth aiming at, in world
 * units. Direction (atan2 of x, y) is fixed for the whole flight, so this is what decides how far
 * from dead-ahead a threat can enter.
 *
 * Set past CANOPY_FOV * THREAT_SPAWN_Z so a wide entry's bearing at spawn clears the boresight cone —
 * it exists only on the radar until the pilot steers it into view, which is the "before they are
 * visible through the canopy" FR-003 asks for. Still inside CANOPY_FOV*THREAT_SPAWN_Z + PAN_LIMIT, so
 * full steering always closes the gap: nothing spawns unreachable.
 */
const THREAT_SPREAD_X = 11;
/**
 * How far above/below the flight path a threat can be, in world units — much tighter than the
 * horizontal spread on purpose. Threats fly in roughly level with the ship, banking left and right
 * to attack rather than diving from high above or climbing from below; the small wobble is texture,
 * not a second axis of "wide entry". Kept well under CANOPY_FOV * THREAT_SPAWN_Z so a threat is never
 * hidden by altitude alone the way it can be hidden by bearing off to one side.
 */
const THREAT_SPREAD_Y = 4;

/**
 * FR-003/FR-004: the boresight cone the canopy actually shows, in bearing units — fixed regardless of
 * the canopy's on-screen aspect ratio. Without this, a wide monitor's canopy is wide enough in
 * bearing-space that a threat entering from the side is inside it the instant it spawns, and the
 * radar would never actually be "before" the canopy for anyone playing on a landscape screen.
 * Matches the vertical half-extent the canopy geometry already enforces for free (`unit` in
 * render.ts), so the cone reads the same on every screen rather than only being reliable vertically.
 */
export const CANOPY_FOV = 1.0;

/**
 * FR-003/FR-004: whether the threat's bearing currently falls inside the boresight cone at all — the
 * canopy only draws it when this is true. Distinct from `isInReticle`, the much smaller aiming window
 * that sits inside this cone; a threat can be canopy-visible for a while before it is also lined up
 * to shoot.
 */
export function isVisible(threat: Threat, view: GameState["view"]): boolean {
  const bearingX = threat.x / threat.z - view.x;
  const bearingY = threat.y / threat.z - view.y;
  return Math.abs(bearingX) <= CANOPY_FOV && Math.abs(bearingY) <= CANOPY_FOV;
}

/**
 * The crosshair window, measured from the centre of the view in canopy half-heights. Game logic owns
 * these numbers and `render.ts` draws the reticle to them, never the other way round: what the player
 * aims at has to be the same rectangle the shot is tested against, or FR-005 lies.
 */
export const RETICLE = { halfWidth: 0.32, halfHeight: 0.22 };

/** Rounds carried, per FR-006 and FR-007. */
const CANNON_ROUNDS = 16;
const ROCKET_ROUNDS = 3;

/** How long a kill stays on screen before the next threat enters. Exported so the drawing ends with it. */
export const BURST_TIME = 0.6;
/** How long the cannon tracer is drawn. Short enough to read as a shot, not a beam. */
const FLASH_TIME = 0.08;

/**
 * Business Logic: "ten threats reaching the centre end the run in defeat" — 100 / 10 = 10 infections.
 * Exported so `render.ts` can read the same ceiling for the entropy/energy gauges and the crack pattern.
 */
export const MAX_ENTROPY = 100;
/** FR-010/US-02: "entropy rises by 10%" per infection, flat regardless of how it was missed. */
const INFECTION_ENTROPY = 10;

/** FR-012: the wave size — top of the PRD's 12-15 range, tuned by the user. */
export const WAVE_SIZE = 15;

/**
 * Level 2 thresholds, set by the user. WIN_TARGET correct answers wins outright; the run survives
 * up to MISTAKE_YELLOW - 1 mistakes unmarked, MISTAKE_YELLOW turns the light amber as a warning, and
 * MISTAKE_LOSE ends it. QUESTIONS.length (10) covers the worst survivable case — WIN_TARGET correct
 * plus MISTAKE_LOSE - 1 mistakes is 9 questions — so the pool never runs out before a decision.
 */
export const WIN_TARGET = 7;
export const MISTAKE_YELLOW = 2;
export const MISTAKE_LOSE = 3;
/** How long a right/wrong flash holds before the next question — same pacing as BURST_TIME. */
export const FEEDBACK_TIME = 0.6;

/** FR-013: the run is lost once entropy has nowhere further to go. */
export function isDefeated(state: GameState): boolean {
  return state.entropy >= MAX_ENTROPY;
}

/**
 * FR-004, and the geometry behind the PRD's cost-of-delay rule.
 *
 * A threat holds a fixed lateral offset and closes at a constant rate, so its apparent size grows
 * as 1/z while its apparent speed across the canopy grows as 1/z². Speed therefore outruns size by
 * a factor of 1/z: the target gets bigger, but it sweeps out of the crosshair faster than it grows
 * into it. That is exactly "escaping the crosshair faster than it grows as a target" from the
 * Business Logic section — it falls out of the projection rather than being faked with a curve.
 *
 * The offset is why threats pass the ship rather than converging on it. A threat flying dead centre
 * would get easier to hit the longer it was ignored, which inverts the rule the game is teaching.
 */
export function advanceThreat(threat: Threat, dt: number): void {
  threat.z -= THREAT_SPEED * dt;
}

/** True once the threat has reached the ship's plane — US-02's infection, not yet paid for. */
export function hasPassed(threat: Threat): boolean {
  return threat.z <= THREAT_PASS_Z;
}

/** Placeholder until FR-012 brings a real wave: one threat at a time, so the approach is repeatable. */
function spawnThreat(): Threat {
  return {
    x: (Math.random() * 2 - 1) * THREAT_SPREAD_X,
    y: (Math.random() * 2 - 1) * THREAT_SPREAD_Y,
    z: THREAT_SPAWN_Z,
  };
}

/**
 * FR-005. A threat counts as inside the crosshair when its *centre* falls in the reticle window —
 * its apparent size is deliberately not part of the test.
 *
 * The alternative, counting any overlap between the threat and the reticle, would make a close
 * threat easier to hit precisely because it had grown large, which inverts the lesson the game
 * exists to teach. With the centre rule the bearing is what matters, and bearing sweeps as 1/z²:
 * late kills are harder, exactly as the Business Logic section promises. This is a settled rule.
 */
export function isInReticle(threat: Threat, view: GameState["view"]): boolean {
  const bearingX = threat.x / threat.z - view.x;
  const bearingY = threat.y / threat.z - view.y;
  return Math.abs(bearingX) <= RETICLE.halfWidth && Math.abs(bearingY) <= RETICLE.halfHeight;
}

/**
 * FR-006. The round is spent before the hit is tested, which is the point of US-01's second
 * acceptance criterion: a shot into empty sky costs exactly as much as a shot that lands.
 */
export function fireCannon(state: GameState): void {
  if (state.ammo.cannon <= 0) return;
  state.ammo.cannon -= 1;
  state.flash = FLASH_TIME;
  if (state.threat !== null && isInReticle(state.threat, state.view)) destroy(state, state.threat);
}

/** FR-007: homing, so it always hits — the skill is in deciding whether one of the three is worth it. */
export function fireRocket(state: GameState): void {
  if (state.ammo.rocket <= 0 || state.threat === null) return;
  state.ammo.rocket -= 1;
  destroy(state, state.threat);
}

function destroy(state: GameState, threat: Threat): void {
  state.burst = { x: threat.x, y: threat.y, z: threat.z, age: 0 };
  state.threat = null;
  state.locked = false;
  state.resolved += 1;
}

/** FR-001/FR-014: (re)starts a run at Level 1 — the same call whether this is the first launch or a replay. */
function startRun(state: GameState): void {
  state.phase = "playing";
  state.view = { x: 0, y: 0 };
  state.threat = spawnThreat();
  state.burst = null;
  state.ammo = { cannon: CANNON_ROUNDS, rocket: ROCKET_ROUNDS };
  state.entropy = 0;
  state.resolved = 0;
  state.locked = false;
  state.flash = 0;
  state.repair = null;
}

/** Fisher-Yates: an unbiased shuffle of the question pool for this Level 2 run. */
function shuffledQuestionIndices(): number[] {
  const indices = QUESTIONS.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/** Enters Level 2 with a freshly shuffled question queue and the first question drawn. */
function startRepair(state: GameState): void {
  const queue = shuffledQuestionIndices();
  state.phase = "repair";
  state.repair = {
    queue,
    question: queue.shift() ?? null,
    correct: 0,
    mistakes: 0,
    feedback: null,
    feedbackTime: 0,
  };
}

/**
 * Scores the pick against QUESTIONS, then leaves the result on screen for FEEDBACK_TIME before
 * `advanceRepair` decides whether that was the win, the loss, or just the next question.
 */
function answerQuestion(repair: RepairState, choice: 0 | 1 | 2): void {
  if (repair.question === null) return;
  const right = QUESTIONS[repair.question].correct === choice;
  if (right) repair.correct += 1;
  else repair.mistakes += 1;
  repair.question = null;
  repair.feedback = right ? "correct" : "wrong";
  repair.feedbackTime = FEEDBACK_TIME;
}

/**
 * Reads an armed answer pick and consumes it — mirrors `fireArmedWeapons`. Input is ignored while a
 * feedback flash is showing or after the round has already been decided, same as weapons firing into
 * a burst that's still playing.
 */
function answerArmedChoice(state: GameState, controls: Controls): void {
  const picked = controls.answer.a ? 0 : controls.answer.b ? 1 : controls.answer.c ? 2 : null;
  controls.answer.a = false;
  controls.answer.b = false;
  controls.answer.c = false;

  const { repair } = state;
  if (picked === null || repair === null) return;
  if (repair.question === null || repair.feedback !== null) return;
  answerQuestion(repair, picked);
}

/** The Level 2 counterpart to `advance`: ticks the feedback flash, then resolves win/loss/next question. */
function advanceRepair(state: GameState, dt: number): void {
  const { repair } = state;
  if (repair === null) return;
  if (repair.feedback === null) return;

  repair.feedbackTime -= dt;
  if (repair.feedbackTime > 0) return;
  repair.feedback = null;

  if (repair.mistakes >= MISTAKE_LOSE) {
    state.phase = "corrupted";
  } else if (repair.correct >= WIN_TARGET) {
    state.phase = "repaired";
  } else {
    repair.question = repair.queue.shift() ?? null;
  }
}

export function start(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D context unavailable");

  const controls = createInput(window);
  const state: GameState = {
    phase: "intro",
    view: { x: 0, y: 0 },
    threat: null,
    burst: null,
    ammo: { cannon: CANNON_ROUNDS, rocket: ROCKET_ROUNDS },
    entropy: 0,
    resolved: 0,
    locked: false,
    flash: 0,
    fps: 0,
    repair: null,
  };

  const resize = () => {
    const dpr = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener("resize", resize);
  resize();

  let previous = performance.now();
  let framesSinceSample = 0;
  let secondsSinceSample = 0;

  const frame = (now: number) => {
    // A tab left in the background hands back a huge first delta; clamping keeps the view from teleporting.
    const dt = Math.min((now - previous) / 1000, 0.1);
    previous = now;

    if (state.phase === "playing") {
      applySteering(state.view, controls.steer, dt);
      fireArmedWeapons(state, controls);
      advance(state, dt);
    } else if (state.phase === "repair") {
      answerArmedChoice(state, controls);
      advanceRepair(state, dt);
    } else if (controls.armed.cannon) {
      // FR-001/FR-014: the fire key doubles as launch/replay/continue — one key to learn, not two.
      controls.armed.cannon = false;
      controls.armed.rocket = false;
      if (state.phase === "intro") {
        state.phase = "title"; // The briefing only ever advances to the title screen, once.
      } else if (state.phase === "wave-cleared") {
        startRepair(state); // FR-012 leads into Level 2, not back to the title screen.
      } else {
        startRun(state); // title, lost, repaired, corrupted: any of these starts a fresh run.
      }
    }

    framesSinceSample += 1;
    secondsSinceSample += dt;
    if (secondsSinceSample >= 0.5) {
      state.fps = Math.round(framesSinceSample / secondsSinceSample);
      framesSinceSample = 0;
      secondsSinceSample = 0;
    }

    drawCockpit(ctx, canvas.clientWidth, canvas.clientHeight, state);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

/**
 * Steering is read as held state, but a shot is an event, so the frame loop consumes it. Firing
 * before the world advances means the player is shooting at the frame they were shown, which is
 * what the 50 ms response requirement is really about.
 */
function fireArmedWeapons(state: GameState, controls: Controls): void {
  if (controls.armed.cannon) {
    controls.armed.cannon = false;
    fireCannon(state);
  }
  if (controls.armed.rocket) {
    controls.armed.rocket = false;
    fireRocket(state);
  }
}

function advance(state: GameState, dt: number): void {
  state.flash = Math.max(0, state.flash - dt);

  if (state.burst !== null) {
    state.burst.age += dt;
    if (state.burst.age >= BURST_TIME) {
      state.burst = null;
      if (state.resolved >= WAVE_SIZE) {
        state.phase = "wave-cleared"; // FR-012: the wave is clear, and the last kill's burst has played out.
      } else {
        state.threat = spawnThreat();
      }
    }
    return;
  }

  if (state.threat === null) return;
  advanceThreat(state.threat, dt);
  if (hasPassed(state.threat)) {
    // US-02: an unstopped threat costs entropy, not a life — the run continues unless this was the last straw.
    state.entropy = Math.min(MAX_ENTROPY, state.entropy + INFECTION_ENTROPY);
    state.resolved += 1;
    state.threat = null;
    state.locked = false;
    if (isDefeated(state)) {
      state.phase = "lost"; // FR-013: the canopy has shattered.
    } else if (state.resolved >= WAVE_SIZE) {
      state.phase = "wave-cleared"; // FR-012: the wave is clear.
    } else {
      state.threat = spawnThreat();
    }
    return;
  }
  state.locked = isInReticle(state.threat, state.view);
}
