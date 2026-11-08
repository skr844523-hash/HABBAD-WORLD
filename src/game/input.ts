export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setKeys?: (codes: string[]) => void;
  setSteer?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
    __gameReady?: boolean;
  }
}

export const input = {
  keys: new Set<string>(),
  qaOverride: null as Set<string> | null,
  steerOverride: null as number | null,
  joyX: 0,
  joyY: 0,
  jumpHeld: false,
  runHeld: false,
  interactQueued: false,
  prevJump: false,
  prevInteract: false,
  moveX: 0,
  moveY: 0,
  run: false,
  jumpEdge: false,
  interactEdge: false,
  camDx: 0,
  camDy: 0,
};

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyE",
  "KeyF",
]);

export function radial(x: number, y: number, dz = 0.16) {
  const m = Math.hypot(x, y);
  if (m < dz || m === 0) return { x: 0, y: 0 };
  const s = (m - dz) / ((1 - dz) * m);
  return { x: x * s, y: y * s };
}

export function bindInput(onEscape: () => void) {
  const down = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (GAME_KEYS.has(e.code) || e.code === "Escape") e.preventDefault();
    if (e.code === "Escape") onEscape();
    input.keys.add(e.code);
  };
  const up = (e: KeyboardEvent) => {
    input.keys.delete(e.code);
  };
  const clear = () => {
    input.keys.clear();
    input.joyX = 0;
    input.joyY = 0;
    input.jumpHeld = false;
    input.runHeld = false;
  };
  const vis = () => {
    if (document.hidden) clear();
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", vis);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", clear);
    document.removeEventListener("visibilitychange", vis);
  };
}

export function sampleInput() {
  const keys = input.qaOverride ?? input.keys;
  let mx = 0;
  let my = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) my += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) my -= 1;

  const joy = radial(input.joyX, input.joyY, 0.12);
  mx += joy.x;
  my += joy.y;

  let jumpDown = keys.has("Space") || input.jumpHeld;
  let interactDown = keys.has("KeyE") || keys.has("KeyF");
  let run = keys.has("ShiftLeft") || keys.has("ShiftRight") || input.runHeld;

  const pads = navigator.getGamepads?.();
  const pad = pads ? pads[0] : null;
  if (pad) {
    const stick = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0, 0.18);
    mx += stick.x;
    my += -stick.y;
    const rx = pad.axes[2] ?? 0;
    const ry = pad.axes[3] ?? 0;
    if (Math.hypot(rx, ry) > 0.22) {
      input.camDx += rx * 0.035;
      input.camDy += ry * 0.025;
    }
    if (pad.buttons[0]?.pressed) jumpDown = true;
    if (pad.buttons[1]?.pressed || pad.buttons[2]?.pressed) interactDown = true;
    if ((pad.buttons[7]?.value ?? 0) > 0.45 || pad.buttons[5]?.pressed) run = true;
  }

  const mag = Math.hypot(mx, my);
  if (mag > 1) {
    mx /= mag;
    my /= mag;
  }

  input.moveX = mx;
  input.moveY = my;
  input.run = run;
  input.jumpEdge = jumpDown && !input.prevJump;
  input.prevJump = jumpDown;
  input.interactEdge = (interactDown && !input.prevInteract) || input.interactQueued;
  input.prevInteract = interactDown;
  input.interactQueued = false;
}
