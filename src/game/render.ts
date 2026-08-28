import {
  BURST_TIME,
  isVisible,
  MAX_ENTROPY,
  MISTAKE_LOSE,
  MISTAKE_YELLOW,
  RETICLE,
  THREAT_PASS_Z,
  THREAT_SPAWN_Z,
  WIN_TARGET,
  type GameState,
  type RepairState,
  type Threat,
} from "./game";
import { QUESTIONS } from "./questions";

/**
 * Flat, vector-only construction — still the PRD non-goal's line, just inverted: light linework on a
 * dark ground instead of black on white, per the Przeprogramowani reference. No photographic or
 * rendered art either way; every shape here is still a canvas primitive.
 */
const INK = "#eef1f5";
const PAPER = "#14141c";
/** A dimming scrim behind modal text (title/wave-cleared/lost) — PAPER, not quite opaque. */
const OVERLAY_BG = "rgba(20, 20, 28, 0.92)";
/** A shade above PAPER — the "card" a main panel sits on, giving it a surface to cast a shadow onto. */
const PANEL_SURFACE = "#1c1e2a";
const PANEL_SHADOW = "rgba(0, 0, 0, 0.55)";

/**
 * The cockpit's whole accent vocabulary — five colours, each with exactly one meaning, reused
 * everywhere rather than picked per screen:
 *   ALERT (red)         — danger and the player's own combat action, which read as one thing in
 *                          this game: threat blip, entropy fill, cracks, tracers, burst, the locked
 *                          crosshair, a wrong Level 2 answer, the corrupted status light.
 *   LIGHT_GREEN         — success: a correct Level 2 answer, the repaired status light.
 *   LIGHT_YELLOW        — warning: the mistake-threshold status light. Nothing else uses yellow.
 *   ENERGY_COLOR (blue) — the one cool colour, reserved for the energy gauge alone, so its reading
 *                         never competes visually with the red/green/yellow verdict colours above.
 *   ACCENT (orange)     — call to action, and only that: every "press space" prompt is drawn as a
 *                         filled pill in this colour (`drawCtaButton`) rather than bare text, so the
 *                         one thing the player should do next is never ambiguous with a status light.
 * SCREEN_GREEN sits outside this vocabulary on purpose: it is the device's screen-glass colour from
 * the "Ręka level2" reference, not a status a player reads meaning into.
 */
const ALERT = "#d40000";
const ENERGY_COLOR = "#1e9be0";
const LIGHT_YELLOW = "#e0b31e";
const LIGHT_GREEN = "#1e9e46";
const ACCENT = "#e8720d";
const SCREEN_GREEN = "#2ecc59";
/**
 * One typeface for the whole cockpit — a monospace readout instead of the OS-default sans, so
 * numbers and labels read as instrument data rather than a plain UI. Consolas ships with Windows
 * (the booth laptop); Courier New is the universal fallback everywhere else.
 */
const FONT = '"Consolas", "Courier New", monospace';

/** Canopy occupies the top of the frame; the instrument strip takes the rest. Proportions follow the mockups. */
const CANOPY_HEIGHT = 0.72;
const MARGIN = 0.02;
/** Threat radius in world units, divided by distance to get its apparent size in the canopy. */
const THREAT_RADIUS = 0.16;
/** Screen-shake displacement per unit of `state.shake`, as a fraction of the canopy's own height. */
const SHAKE_AMPLITUDE = 0.03;
/**
 * Line-weight hierarchy: every stroke used the same width, which read as one flat wireframe rather
 * than a panel with things mounted on it. Structural borders (canopy, device, server rack, the three
 * instrument-strip panels) scale up by this factor; everything mounted inside them — gauges, pips,
 * ticks, the crosshair, HUD corners — stays at the base width set once in `drawCockpit`.
 */
const MAIN_LINE_SCALE = 1.7;

/** Level 2 takes over the whole canvas with its own scene — nothing here belongs to the cockpit. */
const REPAIR_PHASES: readonly GameState["phase"][] = ["repair", "repaired", "corrupted"];

/** A soft radial glow instead of a flat fill — cheap on a canvas primitive, echoes the reference's ambient light. */
function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height * 0.4,
    0,
    width / 2,
    height * 0.4,
    Math.max(width, height) * 0.8,
  );
  gradient.addColorStop(0, "#1e1f2c");
  gradient.addColorStop(1, PAPER);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function drawCockpit(ctx: CanvasRenderingContext2D, width: number, height: number, state: GameState): void {
  drawBackground(ctx, width, height);

  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.006);
  ctx.lineJoin = "round";

  if (REPAIR_PHASES.includes(state.phase)) {
    drawServerRepair(ctx, width, height, state);
    return;
  }

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

  drawCanopy(ctx, canopy, state);
  drawInstrumentStrip(ctx, strip, state);
  drawFrameRate(ctx, canopy, state.fps);
  if (state.phase === "intro") drawIntro(ctx, canopy);
  else if (state.phase !== "playing") drawOverlay(ctx, canopy, state.phase);
}

/** FR-001/FR-012/FR-013: the title/wave-cleared/lost resting screens, all sharing one layout. */
const OVERLAY_TEXT: Record<
  Exclude<GameState["phase"], "playing" | "intro" | "repair" | "repaired" | "corrupted">,
  { title: string; prompt: string }
> = {
  title: { title: "ENTROPY ATTACKS", prompt: "PRESS SPACE TO LAUNCH" },
  "wave-cleared": { title: "WAVE CLEARED", prompt: "PRESS SPACE TO CONTINUE" },
  lost: { title: "CANOPY BREACHED", prompt: "PRESS SPACE TO FLY AGAIN" },
};

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  canopy: Box,
  phase: Exclude<GameState["phase"], "playing" | "intro" | "repair" | "repaired" | "corrupted">,
): void {
  const { title, prompt } = OVERLAY_TEXT[phase];
  const cx = canopy.x + canopy.w / 2;
  const cy = canopy.y + canopy.h / 2;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(canopy.x, canopy.y, canopy.w, canopy.h, canopy.h * 0.14);
  ctx.fillStyle = OVERLAY_BG;
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(canopy.h * 0.11)}px ${FONT}`;
  ctx.fillText(title, cx, cy - canopy.h * 0.06);
  ctx.restore();

  drawCtaButton(ctx, cx, cy + canopy.h * 0.13, prompt, canopy.h * 0.045);
}

/**
 * FR-015's rationale calls this "the opening briefing" — the PRD leans on it to carry the teaching
 * goal the in-flight messages deliberately don't, since it's the one screen a player is expected to
 * actually read rather than glance past mid-combat. Shown once, before the title screen, never again.
 */
const BRIEFING_LINES = [
  "Planeta REPO w wyniku nadmiernej eksploatacji zasobów stała się niestabilna",
  "sejsmicznie i klimatycznie. Życie na planecie podtrzymuje centralny LLM,",
  "który steruje wszystkimi procesami.",
  "",
  "Niestety REPO nawiedzają również istoty z systemów Rozmytych — tak zwane",
  "ENTROPY. Bliski kontakt z ENTROPAMI powoduje wstrzyknięcie — Bad Code",
  "Injection — co podnosi ENTROPIĘ i prowadzi do zniszczenia systemu.",
  "",
  "Musisz temu zapobiec.",
];

function drawIntro(ctx: CanvasRenderingContext2D, canopy: Box): void {
  const cx = canopy.x + canopy.w / 2;
  const padding = canopy.w * 0.1;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(canopy.x, canopy.y, canopy.w, canopy.h, canopy.h * 0.14);
  ctx.fillStyle = PAPER;
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.textAlign = "center";

  ctx.textBaseline = "top";
  ctx.font = `bold ${Math.round(canopy.h * 0.075)}px ${FONT}`;
  const headingY = canopy.y + canopy.h * 0.1;
  ctx.fillText("ENTROPY ATTACKS", cx, headingY);

  const bodySize = canopy.h * 0.042;
  const lineHeight = bodySize * 1.55;
  ctx.font = `bold ${Math.round(bodySize)}px ${FONT}`;
  ctx.textBaseline = "middle";
  const bodyTop = headingY + canopy.h * 0.16;
  const wrapped = BRIEFING_LINES.flatMap((line) => (line === "" ? [""] : wrapText(ctx, line, canopy.w - padding * 2)));
  wrapped.forEach((line, i) => {
    ctx.fillText(line, cx, bodyTop + i * lineHeight);
  });

  ctx.restore();

  drawCtaButton(ctx, cx, canopy.y + canopy.h * 0.9, "PRESS SPACE TO CONTINUE", canopy.h * 0.045);
}

/**
 * A drawn call-to-action pill — every "press space" prompt in the game, sized to its own text. The
 * flat-outline equivalent of a real CTA button (rounded, filled, high-contrast label) rather than
 * plain text sitting on the background, borrowed from the Przeprogramowani reference without pulling
 * in anything photorealistic.
 */
function drawCtaButton(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, fontSize: number): void {
  ctx.save();
  ctx.font = `bold ${Math.round(fontSize)}px ${FONT}`;
  const padX = fontSize * 0.9;
  const padY = fontSize * 0.55;
  const w = ctx.measureText(text).width + padX * 2;
  const h = fontSize + padY * 2;

  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = fontSize * 0.6;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

/** Greedy word-wrap: canvas text has no native wrapping, so lines are broken to fit `maxWidth`. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (ctx.measureText(candidate).width > maxWidth && current !== "") {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ANSWER_LABELS = ["A", "B", "C"] as const;

/**
 * Level 2: a device screen (left) showing the current question and its a/b/c options, a stylised
 * arm connecting it to a server rack (right) whose status light tracks `repair`. Reuses the flat
 * black-outline style and the `wrapText` helper the intro briefing already established.
 */
function drawServerRepair(ctx: CanvasRenderingContext2D, width: number, height: number, state: GameState): void {
  const margin = Math.min(width, height) * MARGIN;
  const device = { x: margin, y: margin, w: width * 0.58 - margin * 1.5, h: height - margin * 2 };
  // A dedicated gap for the forearm/fist — wide enough for its knuckle bumps and fingertip creases,
  // which a thin connector strip (as when the arm was flavour-only) couldn't fit.
  const armGap = width * 0.12;
  const server = {
    x: device.x + device.w + armGap,
    y: margin,
    w: width - device.x - device.w - armGap - margin,
    h: height - margin * 2,
  };

  drawArm(ctx, device, server);
  drawDevice(ctx, device, state.repair, state.phase);
  drawServerRack(ctx, server, state.repair, state.phase);
}

/**
 * A left forearm bridging the device and the server, clenched into a fist — per the "Ręka level2"
 * reference: three knuckle bumps along the top, fingertip creases on the far edge, a thumb tucked
 * under the bottom. Flavour, not a focal point, so the shape stays inside the device's own bounds.
 */
function drawArm(ctx: CanvasRenderingContext2D, device: Box, server: Box): void {
  const gap = server.x - (device.x + device.w);
  const x0 = device.x + device.w * 0.98; // emerges from just inside the device's edge, hidden under its border
  const x1 = server.x - gap * 0.12; // stops just short of the server box
  const spanX = x1 - x0;

  const wristTopY = device.y + device.h * 0.58;
  const wristBotY = device.y + device.h * 0.86;
  const fistTopY = device.y + device.h * 0.34;
  const fistBotY = device.y + device.h * 0.92;
  const knuckleTopY = device.y + device.h * 0.22;
  const knuckleDipY = device.y + device.h * 0.29;
  const thumbTipY = device.y + device.h * 0.98;

  const knuckleXs = [x0 + spanX * 0.42, x0 + spanX * 0.65, x0 + spanX * 0.86];

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, wristTopY);
  ctx.quadraticCurveTo(x0 + spanX * 0.22, fistTopY, knuckleXs[0], knuckleTopY);
  ctx.quadraticCurveTo(knuckleXs[0] + spanX * 0.07, knuckleDipY, knuckleXs[1], knuckleTopY);
  ctx.quadraticCurveTo(knuckleXs[1] + spanX * 0.07, knuckleDipY, knuckleXs[2], knuckleTopY);
  ctx.quadraticCurveTo(x1, knuckleTopY, x1, fistTopY);
  ctx.lineTo(x1, fistBotY);
  ctx.quadraticCurveTo(x0 + spanX * 0.55, fistBotY, x0 + spanX * 0.42, thumbTipY);
  ctx.quadraticCurveTo(x0 + spanX * 0.3, fistBotY, x0, wristBotY);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Fingertip creases on the fist's far edge — the ends of the curled fingers, seen from the side.
  ctx.save();
  [0.35, 0.55, 0.75].forEach((t) => {
    const y = fistTopY + (fistBotY - fistTopY) * t;
    ctx.beginPath();
    ctx.moveTo(x1 - spanX * 0.07, y - device.h * 0.025);
    ctx.lineTo(x1 - spanX * 0.07, y + device.h * 0.025);
    ctx.stroke();
  });
  ctx.restore();
}

function drawDevice(
  ctx: CanvasRenderingContext2D,
  device: Box,
  repair: RepairState | null,
  phase: GameState["phase"],
): void {
  ctx.beginPath();
  ctx.roundRect(device.x, device.y, device.w, device.h, device.h * 0.06);
  fillPanelSurface(ctx, device.h);

  ctx.save();
  ctx.lineWidth *= MAIN_LINE_SCALE;
  ctx.beginPath();
  ctx.roundRect(device.x, device.y, device.w, device.h, device.h * 0.06);
  ctx.stroke();
  ctx.restore();

  const screen = {
    x: device.x + device.w * 0.06,
    y: device.y + device.h * 0.08,
    w: device.w * 0.88,
    h: device.h * 0.68,
  };
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(screen.x, screen.y, screen.w, screen.h, screen.h * 0.08);
  ctx.fillStyle = repair?.feedback === "correct" ? LIGHT_GREEN : repair?.feedback === "wrong" ? ALERT : SCREEN_GREEN;
  ctx.fill();
  ctx.save();
  ctx.clip();
  drawGlossOverlay(ctx, screen.x, screen.y, screen.w, screen.h * 0.55);
  ctx.restore();
  ctx.stroke();
  drawScreenContent(ctx, screen, repair, phase);
  ctx.restore();

  if (repair !== null && repair.question !== null && repair.feedback === null) {
    drawAnswerKeys(ctx, device, screen);
  } else if (phase === "repaired" || phase === "corrupted") {
    drawContinuePrompt(ctx, device, screen);
  }
}

function drawScreenContent(
  ctx: CanvasRenderingContext2D,
  screen: Box,
  repair: RepairState | null,
  phase: GameState["phase"],
): void {
  const cx = screen.x + screen.w / 2;
  const cy = screen.y + screen.h / 2;
  ctx.fillStyle = INK;
  ctx.textAlign = "center";

  if (phase === "repaired" || phase === "corrupted") {
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(screen.h * 0.16)}px ${FONT}`;
    const message = phase === "repaired" ? "SERVER NAPRAWIONY" : "SERVER ZNISZCZONY";
    wrapText(ctx, message, screen.w * 0.85).forEach((line, i, lines) => {
      ctx.fillText(line, cx, cy + (i - (lines.length - 1) / 2) * screen.h * 0.2);
    });
    return;
  }

  if (repair === null) return;

  if (repair.feedback !== null) {
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(screen.h * 0.2)}px ${FONT}`;
    ctx.fillText(repair.feedback === "correct" ? "POPRAWNIE" : "BŁĄD", cx, cy);
    return;
  }

  if (repair.question === null) return;
  drawQuestionScreen(ctx, screen, QUESTIONS[repair.question]);
}

/**
 * Question and its three options together, terminal-style, on the wrist device's own LCD — per the
 * "Ręka level2" reference, where the screen carries all the text and the physical keys below it
 * carry only the letter. Monospace stands in for the reference's blocky LCD digits.
 */
function drawQuestionScreen(ctx: CanvasRenderingContext2D, screen: Box, question: (typeof QUESTIONS)[number]): void {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const padX = screen.x + screen.w * 0.06;
  const maxTextW = screen.w * 0.88;
  let y = screen.y + screen.h * 0.055;

  ctx.font = `bold ${Math.round(screen.h * 0.068)}px ${FONT}`;
  const promptLineH = screen.h * 0.09;
  wrapText(ctx, question.prompt, maxTextW).forEach((line) => {
    ctx.fillText(line, padX, y);
    y += promptLineH;
  });

  y += screen.h * 0.025;

  ctx.font = `${Math.round(screen.h * 0.054)}px ${FONT}`;
  const optionLineH = screen.h * 0.078;
  question.options.forEach((option, i) => {
    wrapText(ctx, `${ANSWER_LABELS[i]}) ${option}`, maxTextW).forEach((line) => {
      ctx.fillText(line, padX, y);
      y += optionLineH;
    });
    y += optionLineH * 0.15;
  });
}

/** The physical A/B/C keys below the screen — small keycaps, letter only, per the reference drawing. */
function drawAnswerKeys(ctx: CanvasRenderingContext2D, device: Box, screen: Box): void {
  const top = screen.y + screen.h + device.h * 0.05;
  const rowH = device.y + device.h * 0.94 - top;
  const keyW = device.w * 0.22;
  const gap = (device.w * 0.88 - keyW * 3) / 2;
  const startX = device.x + device.w * 0.06;

  ctx.fillStyle = INK; // The screen block above leaves fillStyle on PAPER; text would be invisible otherwise.
  ANSWER_LABELS.forEach((label, i) => {
    const x = startX + i * (keyW + gap);
    ctx.beginPath();
    ctx.roundRect(x, top, keyW, rowH, rowH * 0.22);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(rowH * 0.5)}px ${FONT}`;
    ctx.fillText(label, x + keyW / 2, top + rowH / 2);
  });
}

function drawContinuePrompt(ctx: CanvasRenderingContext2D, device: Box, screen: Box): void {
  drawCtaButton(
    ctx,
    device.x + device.w / 2,
    screen.y + screen.h + device.h * 0.16,
    "PRESS SPACE TO PLAY AGAIN",
    device.h * 0.045,
  );
}

/**
 * FR mirrors the cockpit's ENERGY/ENTROPY panel: a glanceable status readout. Only one light is ever
 * lit — unlit means "still nominal, no warning yet" (fewer than MISTAKE_YELLOW mistakes and short of
 * WIN_TARGET), matching the user's spec that the colour only changes on a mistake or the final win.
 */
function drawServerRack(
  ctx: CanvasRenderingContext2D,
  server: Box,
  repair: RepairState | null,
  phase: GameState["phase"],
): void {
  ctx.beginPath();
  ctx.roundRect(server.x, server.y, server.w, server.h, server.h * 0.03);
  fillPanelSurface(ctx, server.h);

  ctx.save();
  ctx.lineWidth *= MAIN_LINE_SCALE;
  ctx.beginPath();
  ctx.roundRect(server.x, server.y, server.w, server.h, server.h * 0.03);
  ctx.stroke();
  ctx.restore();

  const lit = phase === "repaired" ? "green" : phase === "corrupted" ? "red" : lightFromMistakes(repair);
  const lights: { color: string; on: "red" | "yellow" | "green" }[] = [
    { color: ALERT, on: "red" },
    { color: LIGHT_YELLOW, on: "yellow" },
    { color: LIGHT_GREEN, on: "green" },
  ];

  const cx = server.x + server.w * 0.22;
  const spacing = server.h * 0.16;
  const top = server.y + server.h * 0.18;
  const r = Math.min(server.w, server.h) * 0.05;

  lights.forEach(({ color, on }, i) => {
    const cy = top + i * spacing;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = lit === on ? color : PAPER;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + r * 1.6, cy);
    ctx.lineTo(server.x + server.w * 0.88, cy);
    ctx.stroke();
  });

  if (repair !== null) drawRepairProgress(ctx, server, repair, top + lights.length * spacing);
}

function lightFromMistakes(repair: RepairState | null): "red" | "yellow" | "green" | null {
  if (repair === null) return null;
  return repair.mistakes >= MISTAKE_YELLOW ? "yellow" : null;
}

/**
 * A pip row per count, echoing `drawAmmo`'s pattern — filled/empty squares read at a glance the way
 * "3/7" doesn't, and colouring them LIGHT_GREEN/ALERT ties straight into the cockpit's colour legend
 * (success / danger) instead of leaving the numbers to carry that meaning on their own.
 */
function drawRepairProgress(ctx: CanvasRenderingContext2D, server: Box, repair: RepairState, y: number): void {
  const pad = server.w * 0.08;
  const width = server.w - pad * 2;
  const rows: { label: string; total: number; left: number; color: string }[] = [
    { label: "POPRAWNE", total: WIN_TARGET, left: repair.correct, color: LIGHT_GREEN },
    { label: "BŁĘDY", total: MISTAKE_LOSE, left: repair.mistakes, color: ALERT },
  ];

  ctx.save();
  ctx.lineWidth *= 0.7;
  rows.forEach(({ label, total, left, color }, row) => {
    const rowTop = y + server.h * (0.02 + row * 0.15);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `${Math.round(server.h * 0.045)}px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.fillText(label, server.x + pad, rowTop);

    const pipY = rowTop + server.h * 0.06;
    const step = width / total;
    const pipWidth = step * 0.62;
    const pipHeight = server.h * 0.07;
    for (let i = 0; i < total; i += 1) {
      const px = server.x + pad + i * step;
      ctx.beginPath();
      ctx.rect(px, pipY, pipWidth, pipHeight);
      ctx.fillStyle = i < left ? color : PAPER;
      ctx.fill();
      ctx.stroke();
    }
  });
  ctx.restore();
}

function drawCanopy(ctx: CanvasRenderingContext2D, canopy: Box, state: GameState): void {
  ctx.save();
  if (state.shake > 0) {
    const amp = canopy.h * SHAKE_AMPLITUDE * state.shake;
    ctx.translate((Math.random() * 2 - 1) * amp, (Math.random() * 2 - 1) * amp);
  }

  ctx.beginPath();
  ctx.roundRect(canopy.x, canopy.y, canopy.w, canopy.h, canopy.h * 0.14);
  fillPanelSurface(ctx, canopy.h);

  ctx.save();
  ctx.lineWidth *= MAIN_LINE_SCALE;
  ctx.beginPath();
  ctx.roundRect(canopy.x, canopy.y, canopy.w, canopy.h, canopy.h * 0.14);
  ctx.stroke();
  ctx.restore();
  drawHudCorners(ctx, canopy, canopy.h * 0.05, canopy.h * 0.09);

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
  ctx.restore();
}

/**
 * Fills the current path with PANEL_SURFACE and drops a soft shadow under it — the "floating card"
 * a main panel sits on. Shadow state is scoped to this call alone; callers stroke the crisp border
 * afterwards, unaffected. Call `beginPath` + shape the path just before calling this.
 */
function fillPanelSurface(ctx: CanvasRenderingContext2D, panelHeight: number): void {
  ctx.save();
  ctx.shadowColor = PANEL_SHADOW;
  ctx.shadowBlur = panelHeight * 0.06;
  ctx.shadowOffsetY = panelHeight * 0.02;
  ctx.fillStyle = PANEL_SURFACE;
  ctx.fill();
  ctx.restore();
}

/**
 * Viewfinder-style corner brackets, inset from a panel's true corners — a HUD cue borrowed from
 * camera/targeting overlays. Cosmetic frame only, so it draws on the panel's outer edge and never
 * competes with the threat/crosshair it surrounds.
 */
function drawHudCorners(ctx: CanvasRenderingContext2D, box: Box, inset: number, arm: number): void {
  const corners: [number, number, number, number][] = [
    [box.x + inset, box.y + inset, 1, 1],
    [box.x + box.w - inset, box.y + inset, -1, 1],
    [box.x + inset, box.y + box.h - inset, 1, -1],
    [box.x + box.w - inset, box.y + box.h - inset, -1, -1],
  ];
  corners.forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x + arm * sx, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + arm * sy);
    ctx.stroke();
  });
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

  ctx.font = `${Math.round(strip.h * 0.18)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;

  for (const [index, label] of ["ARM", "RADAR", "ENERGY / ENTROPY"].entries()) {
    const w = strip.w * widths[index];
    ctx.beginPath();
    ctx.rect(x, strip.y, w, strip.h);
    fillPanelSurface(ctx, strip.h);

    ctx.save();
    ctx.lineWidth *= MAIN_LINE_SCALE;
    ctx.strokeRect(x, strip.y, w, strip.h);
    ctx.restore();
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

  ctx.font = `${Math.round(colH * 0.12)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;
  ctx.fillText(label, colX + colW / 2, colY + colH * 0.24);

  // The tick bracket: a spine with three ticks, read top to bottom as 100 / 50 / 0.
  ctx.font = `${Math.round(colH * 0.09)}px ${FONT}`;
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
  const fillH = barH * clamp01(fraction);
  const fillY = barTop + barH - fillH;
  ctx.fillStyle = fill;
  ctx.fillRect(barX, fillY, barW, fillH);
  drawGlossOverlay(ctx, barX, fillY, barW, fillH);

  ctx.restore();
}

/** A soft light-to-transparent gradient over a filled shape — the glass/glossy read modern UI bars use. */
function drawGlossOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  if (h <= 0) return;
  const gloss = ctx.createLinearGradient(0, y, 0, y + h);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.3)");
  gloss.addColorStop(0.6, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(x, y, w, h);
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

  // Compass ticks at the four cardinal points — instrument dressing, not a real heading readout.
  for (let deg = 0; deg < 360; deg += 90) {
    const angle = (deg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * radius * 0.86, cy + Math.sin(angle) * radius * 0.86);
    ctx.lineTo(cx + Math.cos(angle) * radius * 1.08, cy + Math.sin(angle) * radius * 1.08);
    ctx.stroke();
  }

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
  ctx.font = `${Math.round(canopy.h * 0.06)}px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;
  ctx.fillText(`${fps} fps`, canopy.x + canopy.w - canopy.h * 0.06, canopy.y + canopy.h * 0.05);
}
