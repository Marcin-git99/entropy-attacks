export interface SteerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Controls {
  steer: SteerInput;
  /**
   * Weapons are edge-triggered: a key-down arms a shot and the frame loop consumes it. Holding the
   * key down does not keep firing, so a round is always a deliberate spend — which is the whole
   * point of an ammunition budget the player has to ration.
   */
  armed: { cannon: boolean; rocket: boolean };
}

/**
 * FR-002: the ship steers from the numeric keypad — 8 up, 5 down, 4 left, 6 right. 4, 5 and 6 share
 * a row with 8 directly above 5, so the four keys form the inverted T that arrow keys and WASD have
 * trained every player to expect.
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

/**
 * FR-006 and FR-007. Space fires the cannon because it is the one key every player already reads as
 * "fire" — and with no tutorial screen, discoverability is a requirement rather than a nicety. The
 * rocket sits on Numpad0, the wide bar under the steering keys, so the scarce weapon is the one that
 * cannot be hit by accident while hammering space.
 */
const WEAPON_MAP: Partial<Record<string, keyof Controls["armed"]>> = {
  Space: "cannon",
  Numpad0: "rocket",
};

export function createInput(target: Window): Controls {
  const controls: Controls = {
    steer: { up: false, down: false, left: false, right: false },
    armed: { cannon: false, rocket: false },
  };

  target.addEventListener("keydown", (event) => {
    const direction = KEY_MAP[event.code];
    if (direction !== undefined) {
      event.preventDefault();
      controls.steer[direction] = true;
      return;
    }
    const weapon = WEAPON_MAP[event.code];
    if (weapon === undefined) return;
    // Space scrolls the page, and a held key repeats at the OS rate — neither belongs in a cockpit.
    event.preventDefault();
    if (!event.repeat) controls.armed[weapon] = true;
  });

  target.addEventListener("keyup", (event) => {
    const direction = KEY_MAP[event.code];
    if (direction === undefined) return;
    event.preventDefault();
    controls.steer[direction] = false;
  });

  return controls;
}
