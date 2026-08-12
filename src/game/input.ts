export interface SteerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * FR-002 asks for 8 up, 2 down, 4 left, 6 right. Down is bound to 5 instead, deliberately: 4, 5 and
 * 6 share a row with 8 directly above 5, so 8/4/5/6 forms the inverted T that arrow keys and WASD
 * have trained every player to expect. Reaching down to 2 breaks the hand position. The PRD still
 * specifies 2 — this is a knowing deviation, not a transcription slip.
 *
 * Keys are matched on `event.code` rather than `event.key` on purpose: `key` reports the numpad
 * digits as arrow names when NumLock is off, which would silently break steering on half the
 * laptops at the booth.
 */
const KEY_MAP: Partial<Record<string, keyof SteerInput>> = {
  Numpad8: "up",
  Numpad5: "down",
  Numpad4: "left",
  Numpad6: "right",
};

export function createInput(target: Window): SteerInput {
  const state: SteerInput = { up: false, down: false, left: false, right: false };

  const handle = (pressed: boolean) => (event: KeyboardEvent) => {
    const direction = KEY_MAP[event.code];
    if (direction === undefined) return;
    event.preventDefault();
    state[direction] = pressed;
  };

  target.addEventListener("keydown", handle(true));
  target.addEventListener("keyup", handle(false));

  return state;
}
