import type { GameState } from "./game";

/** Flat black-outline style, per the PRD non-goal that rules out photorealistic art. */
const INK = "#000";
const PAPER = "#fff";

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
  drawInstrumentStrip(ctx, strip);
  drawFrameRate(ctx, canopy, state.fps);
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

  // Perspective divide: a threat's bearing is its lateral offset over its distance, so both its
  // position and its size fall out of z. Nothing here fakes the approach — it is the projection.
  const { threat } = state;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(canopy.x, canopy.y, canopy.w, canopy.h, canopy.h * 0.14);
  ctx.clip();
  drawThreat(
    ctx,
    centreX + (threat.x / threat.z - state.view.x) * unit,
    centreY + (threat.y / threat.z - state.view.y) * unit,
    (THREAT_RADIUS / threat.z) * unit,
  );
  ctx.restore();

  drawCrosshair(ctx, centreX, centreY, unit * 0.22);
}

/** The `><` reticle from the mockups. FR-005 will later light it up when a threat sits inside. */
function drawCrosshair(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const gap = size * 0.45;
  ctx.beginPath();
  ctx.moveTo(cx - size - gap, cy - size);
  ctx.lineTo(cx - gap, cy);
  ctx.lineTo(cx - size - gap, cy + size);
  ctx.moveTo(cx + size + gap, cy - size);
  ctx.lineTo(cx + gap, cy);
  ctx.lineTo(cx + size + gap, cy + size);
  ctx.stroke();
}

function drawThreat(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const wingX = r * 2.4;
  const wingY = r * 1.9;

  ctx.beginPath();
  ctx.moveTo(cx - wingX, cy - wingY);
  ctx.lineTo(cx + wingX, cy + wingY);
  ctx.moveTo(cx - wingX, cy + wingY);
  ctx.lineTo(cx + wingX, cy - wingY);
  ctx.moveTo(cx - wingX, cy - wingY);
  ctx.lineTo(cx - wingX, cy + wingY);
  ctx.moveTo(cx + wingX, cy - wingY);
  ctx.lineTo(cx + wingX, cy + wingY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.stroke();
}

/** Placeholder chrome: the three instrument panels are outlined and labelled, but not yet live. */
function drawInstrumentStrip(ctx: CanvasRenderingContext2D, strip: Box): void {
  const widths = [0.4, 0.22, 0.38];
  let x = strip.x;

  ctx.font = `${Math.round(strip.h * 0.18)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;

  for (const [index, label] of ["ARM", "RADAR", "ENERGY / ENTROPY"].entries()) {
    const w = strip.w * widths[index];
    ctx.strokeRect(x, strip.y, w, strip.h);
    ctx.fillText(label, x + w / 2, strip.y + strip.h * 0.14);
    x += w;
  }
}

/** The PRD asks for a steady 60 fps; without a readout that requirement is unfalsifiable while developing. */
function drawFrameRate(ctx: CanvasRenderingContext2D, canopy: Box, fps: number): void {
  ctx.font = `${Math.round(canopy.h * 0.06)}px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;
  ctx.fillText(`${fps} fps`, canopy.x + canopy.w - canopy.h * 0.06, canopy.y + canopy.h * 0.05);
}
