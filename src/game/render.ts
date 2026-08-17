import {
  BURST_TIME,
  isVisible,
  MAX_ENTROPY,
  RETICLE,
  THREAT_PASS_Z,
  THREAT_SPAWN_Z,
  type GameState,
  type Threat,
} from "./game";

/** Flat black-outline style, per the PRD non-goal that rules out photorealistic art. */
const INK = "#000";
const PAPER = "#fff";
/** Red carries meaning everywhere: a lit crosshair, the radar blip, the entropy fill, the cracks. */
const ALERT = "#d40000";
/** The one cool colour in the cockpit, reserved for the energy fill — per the reference mockup. */
const ENERGY_COLOR = "#1e9be0";

/** Canopy occupies the top of the frame; the instrument strip takes the rest. Proportions follow the mockups. */
const CANOPY_HEIGHT = 0.72;
const MARGIN = 0.02;
/** Threat radius in world units, divided by distance to get its apparent size in the canopy. */
const THREAT_RADIUS = 0.16;

export function drawCockpit(ctx: CanvasRenderingContext2D, width: number, height: number, state: GameState): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);

  const margin = Math.min(width, height) * MARGIN;
  const canopy = {
    x: margin,
    y: margin,
    w: width - margin * 2,
    h: (height - margin * 3) * CANOPY_HEIGHT,
  };
  const strip = {
    x: margin,
    y: canopy.y + canopy.h + margin,
    w: canopy.w,
    h: height - canopy.y - canopy.h - margin * 2,
  };

  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.006);
  ctx.lineJoin = "round";

  drawCanopy(ctx, canopy, state);
  drawInstrumentStrip(ctx, strip, state);
  drawFrameRate(ctx, canopy, state.fps);
  if (state.phase !== "playing") drawOverlay(ctx, canopy, state.phase);
}

/** FR-001/FR-012/FR-013/FR-014: the title/won/lost resting screens, all sharing one layout. */
const OVERLAY_TEXT: Record<Exclude<GameState["phase"], "playing">, { title: string; prompt: string }> = {
  title: { title: "ENTROPY ATTACKS", prompt: "PRESS SPACE TO LAUNCH" },
  won: { title: "WAVE CLEARED", prompt: "PRESS SPACE TO FLY AGAIN" },
  lost: { title: "CANOPY BREACHED", prompt: "PRESS SPACE TO FLY AGAIN" },
};

function drawOverlay(ctx: CanvasRenderingContext2D, canopy: Box, phase: Exclude<GameState["phase"], "playing">): void {
  const { title, prompt } = OVERLAY_TEXT[phase];
  const cx = canopy.x + canopy.w / 2;
  const cy = canopy.y + canopy.h / 2;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(canopy.x, canopy.y, canopy.w, canopy.h, canopy.h * 0.14);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(canopy.h * 0.11)}px system-ui, sans-serif`;
  ctx.fillText(title, cx, cy - canopy.h * 0.06);
  ctx.font = `${Math.round(canopy.h * 0.05)}px system-ui, sans-serif`;
  ctx.fillText(prompt, cx, cy + canopy.h * 0.08);
  ctx.restore();
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function drawCanopy(ctx: CanvasRenderingContext2D, canopy: Box, state: GameState): void {
  ctx.beginPath();
  ctx.roundRect(canopy.x, canopy.y, canopy.w, canopy.h, canopy.h * 0.14);
  ctx.stroke();

  // Threats live in view-relative space: steering pans the view, so the threat slides across the canopy
  // while the crosshair stays nailed to the centre.
  const centreX = canopy.x + canopy.w / 2;
  const centreY = canopy.y + canopy.h / 2;
  const unit = canopy.h / 2;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(canopy.x, canopy.y, canopy.w, canopy.h, canopy.h * 0.14);
  ctx.clip();

  // Perspective divide: a threat's bearing is its lateral offset over its distance, so both its
  // position and its size fall out of z. Nothing here fakes the approach — it is the projection.
  const { threat, burst } = state;
  // FR-003: outside the boresight cone the threat is radar-only — steer towards it to bring it into view.
  if (threat !== null && isVisible(threat, state.view)) {
    drawThreat(
      ctx,
      centreX + (threat.x / threat.z - state.view.x) * unit,
      centreY + (threat.y / threat.z - state.view.y) * unit,
      (THREAT_RADIUS / threat.z) * unit,
    );
  }
  if (burst !== null) {
    drawBurst(
      ctx,
      centreX + (burst.x / burst.z - state.view.x) * unit,
      centreY + (burst.y / burst.z - state.view.y) * unit,
      (THREAT_RADIUS / burst.z) * unit,
      burst.age / BURST_TIME,
    );
  }
  if (state.flash > 0) drawTracers(ctx, canopy, centreX, centreY);

  ctx.restore();

  drawCrosshair(ctx, centreX, centreY, unit, state.locked);
  drawCracks(ctx, canopy, state.entropy);
}

/**
 * FR-019. Cracks are cosmetic damage on the glass itself, so they draw over everything else in the
 * canopy — threat, crosshair, tracers — the same way a real crack would sit between the pilot and
 * the view. Nothing appears below half entropy, matching "past half entropy, each further infection
 * leaves the canopy visibly more cracked than the last"; at MAX_ENTROPY every crack is at full reach,
 * standing in for "the canopy shatters."
 *
 * Shapes are regenerated every frame from a seed per crack index rather than stored in GameState —
 * cheap, and a pseudo-random hash of a fixed integer is exactly as stable across frames as a stored
 * value would be, without game.ts having to own crack geometry it has no other use for.
 */
const CRACK_COUNT = 7;

function drawCracks(ctx: CanvasRenderingContext2D, canopy: Box, entropy: number): void {
  const progress = clamp01((entropy - MAX_ENTROPY / 2) / (MAX_ENTROPY / 2));
  if (progress <= 0) return;

  const active = Math.ceil(progress * CRACK_COUNT);
  const cx = canopy.x + canopy.w / 2;
  const cy = canopy.y + canopy.h / 2;
  const reach = Math.max(canopy.w, canopy.h) * 0.6;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(canopy.x, canopy.y, canopy.w, canopy.h, canopy.h * 0.14);
  ctx.clip();
  for (let i = 0; i < active; i += 1) drawCrack(ctx, cx, cy, reach, progress, i);
  ctx.restore();
}

function drawCrack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  reach: number,
  progress: number,
  seed: number,
): void {
  const angle = pseudoRandom(seed * 7 + 1) * Math.PI * 2;
  const perp = angle + Math.PI / 2;
  const segments = 5;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let s = 1; s <= segments; s += 1) {
    const t = (s / segments) * progress;
    const jitter = (pseudoRandom(seed * 13 + s * 3) - 0.5) * reach * 0.16;
    ctx.lineTo(
      cx + Math.cos(angle) * reach * t + Math.cos(perp) * jitter,
      cy + Math.sin(angle) * reach * t + Math.sin(perp) * jitter,
    );
  }
  ctx.stroke();
}

/** A stable, non-cryptographic hash from an integer seed to [0, 1) — shader-style, cheap, deterministic. */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The `><` reticle from the mockups, drawn to the very rectangle `isInReticle` tests against: the
 * bracket tips mark its corners. FR-005 is the red state — the crosshair lights *before* the shot,
 * which is the acceptance criterion US-01 puts first.
 */
function drawCrosshair(ctx: CanvasRenderingContext2D, cx: number, cy: number, unit: number, locked: boolean): void {
  const outer = RETICLE.halfWidth * unit;
  const height = RETICLE.halfHeight * unit;
  const inner = outer - height;

  ctx.save();
  if (locked) {
    ctx.strokeStyle = ALERT;
    ctx.lineWidth *= 1.8;
  }
  ctx.beginPath();
  ctx.moveTo(cx - outer, cy - height);
  ctx.lineTo(cx - inner, cy);
  ctx.lineTo(cx - outer, cy + height);
  ctx.moveTo(cx + outer, cy - height);
  ctx.lineTo(cx + inner, cy);
  ctx.lineTo(cx + outer, cy + height);
  ctx.stroke();
  ctx.restore();
}

/** Wing span relative to the circle radius, measured off Entrop.jpg — the reference for this shape. */
const WING_X = 2.73;
const WING_Y = 1.48;

function drawThreat(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const wingX = r * WING_X;
  const wingY = r * WING_Y;

  // Just the X — no vertical edges closing off the wingtips, per the reference.
  ctx.beginPath();
  ctx.moveTo(cx - wingX, cy - wingY);
  ctx.lineTo(cx + wingX, cy + wingY);
  ctx.moveTo(cx - wingX, cy + wingY);
  ctx.lineTo(cx + wingX, cy - wingY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.stroke();
}

/** FR-008: a ring of shards thrown outwards, thinning as it goes. Flat outlines, no particles. */
function drawBurst(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, progress: number): void {
  const spokes = 8;
  const reach = r * (2 + progress * 6);

  ctx.save();
  ctx.strokeStyle = ALERT;
  ctx.globalAlpha = 1 - progress;
  ctx.beginPath();
  for (let i = 0; i < spokes; i += 1) {
    const angle = (i / spokes) * Math.PI * 2;
    ctx.moveTo(cx + Math.cos(angle) * reach * 0.45, cy + Math.sin(angle) * reach * 0.45);
    ctx.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * The cannon shot itself. Without it a miss is invisible — the round would just vanish from the
 * counter, and US-01's "a shot that spends ammunition and destroys nothing" would read as a bug.
 */
function drawTracers(ctx: CanvasRenderingContext2D, canopy: Box, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = ALERT;
  ctx.beginPath();
  ctx.moveTo(canopy.x, canopy.y + canopy.h);
  ctx.lineTo(cx, cy);
  ctx.moveTo(canopy.x + canopy.w, canopy.y + canopy.h);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.restore();
}

/** All three panels are live. */
function drawInstrumentStrip(ctx: CanvasRenderingContext2D, strip: Box, state: GameState): void {
  const widths = [0.4, 0.22, 0.38];
  let x = strip.x;

  ctx.font = `${Math.round(strip.h * 0.18)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;

  for (const [index, label] of ["ARM", "RADAR", "ENERGY / ENTROPY"].entries()) {
    const w = strip.w * widths[index];
    ctx.strokeRect(x, strip.y, w, strip.h);
    const panel = { x, y: strip.y, w, h: strip.h };
    if (label === "ARM") {
      ctx.fillText(label, x + w / 2, strip.y + strip.h * 0.14);
      drawAmmo(ctx, panel, state.ammo);
    }
    if (label === "RADAR") {
      ctx.fillText(label, x + w / 2, strip.y + strip.h * 0.14);
      drawRadar(ctx, panel, state.threat, state.view);
    }
    // ENERGY / ENTROPY draws its own two column labels instead of one shared header — see drawEnergyEntropy.
    if (label === "ENERGY / ENTROPY") drawEnergyEntropy(ctx, panel, state.entropy);
    x += w;
  }
}

/**
 * FR-010/FR-011, drawn as two vertical thermometers per the reference mockup — each its own labelled
 * column with a tick bracket, not the horizontal bars this started as. Energy empties in blue; entropy
 * fills in the alert colour, so together they read as one mirrored gauge rather than two unrelated
 * numbers — the "second, faster peripheral read of the same state" the PRD asks for, not new information.
 */
function drawEnergyEntropy(ctx: CanvasRenderingContext2D, panel: Box, entropy: number): void {
  const energy = MAX_ENTROPY - entropy;
  // Padding on both outer edges too, so a right-aligned "100%" tick label never lands on a panel border.
  const pad = panel.w * 0.05;
  const gap = panel.w * 0.06;
  const colW = (panel.w - pad * 2 - gap) / 2;

  drawVerticalGauge(ctx, panel.x + pad, panel.y, colW, panel.h, energy / MAX_ENTROPY, ENERGY_COLOR, "ENERGY");
  drawVerticalGauge(ctx, panel.x + pad + colW + gap, panel.y, colW, panel.h, entropy / MAX_ENTROPY, ALERT, "ENTROPY");
}

function drawVerticalGauge(
  ctx: CanvasRenderingContext2D,
  colX: number,
  colY: number,
  colW: number,
  colH: number,
  fraction: number,
  fill: string,
  label: string,
): void {
  const barTop = colY + colH * 0.4;
  const barH = colH * 0.48;
  const barW = colW * 0.45;
  const barX = colX + colW * 0.44;
  const tickX = barX - colW * 0.1;

  ctx.save();

  ctx.font = `${Math.round(colH * 0.12)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;
  ctx.fillText(label, colX + colW / 2, colY + colH * 0.24);

  // The tick bracket: a spine with three ticks, read top to bottom as 100 / 50 / 0.
  ctx.font = `${Math.round(colH * 0.09)}px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.beginPath();
  ctx.moveTo(tickX, barTop);
  ctx.lineTo(tickX, barTop + barH);
  for (const step of [0, 0.5, 1]) {
    const ty = barTop + barH * (1 - step);
    ctx.moveTo(tickX, ty);
    ctx.lineTo(tickX - colW * 0.06, ty);
  }
  ctx.stroke();
  for (const step of [0, 0.5, 1]) {
    ctx.fillText(`${Math.round(step * 100)}%`, tickX - colW * 0.09, barTop + barH * (1 - step));
  }

  // The bar itself, filled from the bottom up — 0% is an empty outline, 100% is solid.
  ctx.strokeRect(barX, barTop, barW, barH);
  ctx.fillStyle = fill;
  const fillH = barH * clamp01(fraction);
  ctx.fillRect(barX, barTop + barH - fillH, barW, fillH);

  ctx.restore();
}

/**
 * FR-003: a coarse, approximate read of where to steer — deliberately not a faithful projection (a
 * second exact copy of the canopy math would just be two displays to keep in sync for no gameplay
 * gain). Flat 2D space: a threat spawns on the rim (THREAT_SPAWN_Z) and crawls straight in toward the
 * centre (THREAT_PASS_Z, the ship's own plane) as it closes, the classic radar reading. Angle is the
 * bearing relative to wherever the crosshair currently points, not the threat's fixed world direction,
 * so panning the view (steering) visibly turns the blip around the dial rather than leaving it inert.
 */
function drawRadar(ctx: CanvasRenderingContext2D, panel: Box, threat: Threat | null, view: GameState["view"]): void {
  const cx = panel.x + panel.w / 2;
  const cy = panel.y + panel.h * 0.6;
  const radius = Math.min(panel.w, panel.h * 0.75) * 0.36;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // The ship, at the centre of its own radar.
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.06, 0, Math.PI * 2);
  ctx.stroke();

  if (threat !== null) {
    const bearingX = threat.x / threat.z - view.x;
    const bearingY = threat.y / threat.z - view.y;
    const angle = Math.atan2(bearingY, bearingX);

    const approach = clamp01((threat.z - THREAT_PASS_Z) / (THREAT_SPAWN_Z - THREAT_PASS_Z));
    const dist = radius * approach; // 1 (rim) at spawn, 0 (centre) at the pass plane

    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, radius * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = ALERT;
    ctx.fill();
  }
  ctx.restore();
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * FR-009. Rounds are pips rather than digits: the PRD asks for a cockpit readable at a glance by
 * someone watching over a shoulder, and a row that is visibly half empty says more at that distance
 * than the number 8 does.
 */
function drawAmmo(ctx: CanvasRenderingContext2D, panel: Box, ammo: GameState["ammo"]): void {
  const rows: { total: number; left: number }[] = [
    { total: 16, left: ammo.cannon },
    { total: 3, left: ammo.rocket },
  ];
  const pad = panel.w * 0.06;
  const width = panel.w - pad * 2;

  ctx.save();
  ctx.lineWidth *= 0.7;
  for (const [row, { total, left }] of rows.entries()) {
    const y = panel.y + panel.h * (0.52 + row * 0.24);
    const step = width / total;
    const pipWidth = step * 0.62;
    const pipHeight = panel.h * 0.14;
    for (let i = 0; i < total; i += 1) {
      const px = panel.x + pad + i * step;
      ctx.beginPath();
      ctx.rect(px, y, pipWidth, pipHeight);
      ctx.fillStyle = INK;
      if (i < left) ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The PRD asks for a steady 60 fps; without a readout that requirement is unfalsifiable while developing. */
function drawFrameRate(ctx: CanvasRenderingContext2D, canopy: Box, fps: number): void {
  ctx.font = `${Math.round(canopy.h * 0.06)}px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;
  ctx.fillText(`${fps} fps`, canopy.x + canopy.w - canopy.h * 0.06, canopy.y + canopy.h * 0.05);
}
