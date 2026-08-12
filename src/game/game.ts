import { createInput, type SteerInput } from "./input";
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

export interface GameState {
  /** How far the view has panned from dead ahead, in canopy half-heights. */
  view: { x: number; y: number };
  threat: Threat;
  fps: number;
}

/** Canopy half-heights per second. Tuned by eye; the PRD leaves the balance open. */
const PAN_SPEED = 0.9;
/** How far off dead ahead the ship can look before the canopy frame stops it. */
const PAN_LIMIT = 1.4;

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

/** World units per second. Tuned so a threat crosses the whole approach in roughly five seconds. */
const THREAT_SPEED = 2;
/** Where a threat enters, far enough out to be a speck in the canopy. */
const THREAT_SPAWN_Z = 10;
/** The ship's plane. Below this the threat has passed — US-02's "reaches the centre". */
const THREAT_PASS_Z = 0.4;
/** How far off the flight path a threat can be and still be worth aiming at. */
const THREAT_SPREAD = 1.1;

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
  if (threat.z <= THREAT_PASS_Z) respawnThreat(threat);
}

/** Placeholder until FR-012 brings a real wave: one threat, recycled, so the approach is repeatable. */
function respawnThreat(threat: Threat): void {
  threat.x = (Math.random() * 2 - 1) * THREAT_SPREAD;
  threat.y = (Math.random() * 2 - 1) * THREAT_SPREAD;
  threat.z = THREAT_SPAWN_Z;
}

export function start(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D context unavailable");

  const input = createInput(window);
  const state: GameState = { view: { x: 0, y: 0 }, threat: { x: 0.8, y: -0.5, z: THREAT_SPAWN_Z }, fps: 0 };

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

    applySteering(state.view, input, dt);
    advanceThreat(state.threat, dt);

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
