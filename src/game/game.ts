import { createInput, type SteerInput } from "./input";
import { drawCockpit } from "./render";

export interface GameState {
  /** How far the view has panned from dead ahead, in canopy half-heights. */
  view: { x: number; y: number };
  /** A single stationary threat, so steering has something to steer against. */
  threat: { x: number; y: number };
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

export function start(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D context unavailable");

  const input = createInput(window);
  const state: GameState = { view: { x: 0, y: 0 }, threat: { x: 0.8, y: -0.5 }, fps: 0 };

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
