import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { sfx, unlockAudio } from "@/game/audio";
import { FLAG, SECRET, SPAWN } from "@/game/level";

export type Mode = "free" | "challenge" | "chaos" | "coins" | "bowling";
export type Screen = "menu" | "modes" | "chars" | "shop" | "settings" | "minis" | "play";

export type Mission = {
  coins: number;
  booms: number;
  bounces: number;
  drive: number;
  secret: boolean;
  flag: boolean;
  paid: boolean;
};

export type Settings = {
  music: boolean;
  sfx: boolean;
  sens: number;
  shadows: boolean;
};

export type Mover = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
};

const emptyMission = (): Mission => ({
  coins: 0,
  booms: 0,
  bounces: 0,
  drive: 0,
  secret: false,
  flag: false,
  paid: false,
});

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export const DAILY = { coins: 10, booms: 4, jumps: 20, reward: 40 };

type SaveData = {
  coins: number;
  owned: string[];
  equipped: string;
  settings: Settings;
  bestChaos: number;
  bestRush: number;
  bestBowl: number;
  day: string;
  dayCoins: number;
  dayBooms: number;
  dayJumps: number;
  claimed: boolean;
};

type Save = SaveData & {
  addCoins: (n: number, daily?: boolean) => void;
  spend: (n: number) => boolean;
  unlock: (id: string) => void;
  equip: (id: string) => void;
  patchSettings: (p: Partial<Settings>) => void;
  bump: (key: "dayBooms" | "dayJumps", n?: number) => void;
  claimDaily: () => boolean;
  resetSave: () => void;
  noteBest: (key: "bestChaos" | "bestRush" | "bestBowl", value: number) => void;
};

const freshSave = (): SaveData => ({
  coins: 0,
  owned: ["habbad"],
  equipped: "habbad",
  settings: { music: true, sfx: true, sens: 1, shadows: true },
  bestChaos: 0,
  bestRush: 0,
  bestBowl: 0,
  day: today(),
  dayCoins: 0,
  dayBooms: 0,
  dayJumps: 0,
  claimed: false,
});

export const useSave = create<Save>()(
  persist(
    (set, get) => ({
      ...freshSave(),
      addCoins: (n, daily) =>
        set((s) => ({
          coins: s.coins + n,
          dayCoins: daily ? s.dayCoins + n : s.dayCoins,
        })),
      spend: (n) => {
        const s = get();
        if (s.coins < n) return false;
        set({ coins: s.coins - n });
        return true;
      },
      unlock: (id) =>
        set((s) => ({
          owned: s.owned.includes(id) ? s.owned : [...s.owned, id],
          equipped: id,
        })),
      equip: (id) => set({ equipped: id }),
      patchSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      bump: (key, n = 1) => set((s) => ({ [key]: s[key] + n })),
      claimDaily: () => {
        const s = get();
        if (s.claimed) return false;
        if (s.dayCoins < DAILY.coins || s.dayBooms < DAILY.booms || s.dayJumps < DAILY.jumps) return false;
        set({ claimed: true, coins: s.coins + DAILY.reward });
        return true;
      },
      resetSave: () => set(freshSave()),
      noteBest: (key, value) => set((s) => ({ [key]: Math.max(s[key], value) })),
    }),
    {
      name: "habbad-world-v1",
      version: 1,
      partialize: (s) => ({
        coins: s.coins,
        owned: s.owned,
        equipped: s.equipped,
        settings: s.settings,
        bestChaos: s.bestChaos,
        bestRush: s.bestRush,
        bestBowl: s.bestBowl,
        day: s.day,
        dayCoins: s.dayCoins,
        dayBooms: s.dayBooms,
        dayJumps: s.dayJumps,
        claimed: s.claimed,
      }),
    },
  ),
);

export function rollDaily() {
  const d = today();
  useSave.setState((s) => {
    if (s.day === d) return {};
    return { day: d, dayCoins: 0, dayBooms: 0, dayJumps: 0, claimed: false };
  });
}

type Hud = {
  screen: Screen;
  mode: Mode;
  paused: boolean;
  ready: boolean;
  epoch: number;
  banner: string;
  bark: string;
  chaos: number;
  timeLeft: number;
  mini: number;
  mission: Mission;
  held: boolean;
  driving: boolean;
};

export const live = {
  screen: "menu" as Screen,
  mode: "free" as Mode,
  playing: false,
  paused: false,
  epoch: 0,
  banner: "",
  bark: "",
  barkUntil: 0,
  bannerUntil: 0,
  chaos: 0,
  timeLeft: 0,
  mini: 0,
  mission: emptyMission(),
  ready: false,
  startedOnce: false,
};

export const worldApi = {
  focus: new THREE.Vector3(0, 1.2, 22),
  yaw: 0,
  speed: 0,
  grounded: false,
  drivingId: null as string | null,
  heldId: null as string | null,
  teleport: null as { x: number; y: number; z: number } | null,
  shake: 0,
  camYaw: 0,
  bodies: new Map<string, RapierRigidBody>(),
  movers: new Map<string, Mover>(),
  wantRagdoll: false,
  ragdoll: false,
  ragdollLock: 0,
  safe: new THREE.Vector3(0, 1.2, 22),
};

export const useHud = create<Hud>(() => ({
  screen: "menu",
  mode: "free",
  paused: false,
  ready: false,
  epoch: 0,
  banner: "",
  bark: "",
  chaos: 0,
  timeLeft: 0,
  mini: 0,
  mission: emptyMission(),
  held: false,
  driving: false,
}));

export function publish() {
  useHud.setState({
    screen: live.screen,
    mode: live.mode,
    paused: live.paused,
    ready: live.ready,
    epoch: live.epoch,
    banner: performance.now() < live.bannerUntil ? live.banner : "",
    bark: performance.now() < live.barkUntil ? live.bark : "",
    chaos: Math.floor(live.chaos),
    timeLeft: Math.max(0, Math.ceil(live.timeLeft)),
    mini: live.mini,
    mission: { ...live.mission },
    held: !!worldApi.heldId,
    driving: !!worldApi.drivingId,
  });
}

export function say(text: string) {
  live.bark = text;
  live.barkUntil = performance.now() + 750;
  publish();
}

export function requestRagdoll() {
  if (!live.playing || live.paused || worldApi.ragdoll || worldApi.drivingId) return;
  if (performance.now() < worldApi.ragdollLock) return;
  worldApi.wantRagdoll = true;
}

function spawnFor(mode: Mode) {
  return SPAWN[mode] ?? SPAWN.free;
}

export function startGame(mode: Mode) {
  live.mode = mode;
  live.playing = true;
  live.paused = false;
  live.screen = "play";
  live.banner = "";
  live.chaos = 0;
  live.mini = 0;
  live.mission = emptyMission();
  live.timeLeft = mode === "chaos" ? 75 : mode === "coins" || mode === "bowling" ? 45 : 0;
  if (live.startedOnce) live.epoch += 1;
  live.startedOnce = true;
  const s = spawnFor(mode);
  worldApi.teleport = { x: s[0], y: s[1], z: s[2] };
  worldApi.drivingId = null;
  worldApi.heldId = null;
  worldApi.ragdoll = false;
  worldApi.wantRagdoll = false;
  publish();
  unlockAudio();
}

export function togglePause() {
  if (!live.playing) {
    if (live.screen !== "menu") {
      live.screen = "menu";
      publish();
    }
    return;
  }
  live.paused = !live.paused;
  publish();
}

export function backToMenu() {
  live.playing = false;
  live.paused = false;
  live.screen = "menu";
  worldApi.drivingId = null;
  worldApi.heldId = null;
  publish();
}

export function restartRound() {
  live.paused = false;
  live.playing = true;
  live.screen = "play";
  live.chaos = 0;
  live.mini = 0;
  live.banner = "";
  live.mission = emptyMission();
  live.timeLeft = live.mode === "chaos" ? 75 : live.mode === "coins" || live.mode === "bowling" ? 45 : 0;
  live.epoch += 1;
  worldApi.drivingId = null;
  worldApi.heldId = null;
  worldApi.ragdoll = false;
  publish();
}

export function openScreen(screen: Screen) {
  live.screen = screen;
  publish();
}

export function collectCoin(value = 1) {
  if (!live.playing || live.paused) return;
  useSave.getState().addCoins(value, true);
  live.mission.coins += value;
  if (live.mode === "chaos") live.chaos += value * 3;
  if (live.mode === "coins") live.mini += value;
  say("عملة");
  sfx.coin();
}

export function noteBoom() {
  if (!live.playing || live.paused) return;
  useSave.getState().addCoins(2, false);
  useSave.getState().bump("dayBooms", 1);
  live.mission.booms += 1;
  if (live.mode === "chaos") live.chaos += 25;
  if (live.mode === "bowling") live.mini += 1;
  say("بوم");
  sfx.boom();
  worldApi.shake = Math.min(0.7, worldApi.shake + 0.45);
  publish();
}

export function noteBounce() {
  if (!live.playing || live.paused) return;
  live.mission.bounces += 1;
  if (live.mode === "chaos") live.chaos += 6;
  sfx.boing();
}

export function noteJump() {
  if (!live.playing || live.paused) return;
  useSave.getState().bump("dayJumps", 1);
}

export function finishTimed() {
  if (live.mode === "chaos") {
    const score = Math.floor(live.chaos);
    useSave.getState().noteBest("bestChaos", score);
    live.banner = `انتهت الفوضى · ${score} نقطة`;
    live.bannerUntil = performance.now() + 4500;
  } else if (live.mode === "coins") {
    useSave.getState().noteBest("bestRush", live.mini);
    live.banner = `مطر العملات · ${live.mini}`;
    live.bannerUntil = performance.now() + 4500;
  } else if (live.mode === "bowling") {
    useSave.getState().noteBest("bestBowl", live.mini);
    live.banner = `البولينغ · ${live.mini} براميل`;
    live.bannerUntil = performance.now() + 4500;
  }
  live.mode = "free";
  live.timeLeft = 0;
  say("خلصت الجولة");
  publish();
}

export function tickSession(dt: number) {
  if (!live.playing || live.paused) return;
  if (live.mode === "chaos" || live.mode === "coins" || live.mode === "bowling") {
    live.timeLeft -= dt;
    if (live.timeLeft <= 0) {
      live.timeLeft = 0;
      finishTimed();
      return;
    }
  }
  if (live.mode === "chaos" && !worldApi.grounded && !worldApi.drivingId) {
    live.chaos += dt * 5;
  }
  if (worldApi.drivingId) {
    live.mission.drive += dt;
    const car = worldApi.bodies.get(worldApi.drivingId);
    if (car) {
      const p = car.translation();
      if (Math.hypot(p.x - FLAG.x, p.z - FLAG.z) < FLAG.r && live.mission.drive > 2) {
        if (!live.mission.flag) {
          live.mission.flag = true;
          say("وصلت العلم");
        }
      }
    }
  }
  const f = worldApi.focus;
  if (Math.hypot(f.x - SECRET.x, f.z - SECRET.z) < SECRET.r) {
    if (!live.mission.secret) {
      live.mission.secret = true;
      useSave.getState().addCoins(8, false);
      say("الكهف السري");
    }
  }
  const m = live.mission;
  if (
    live.mode === "challenge" &&
    !m.paid &&
    m.coins >= 8 &&
    m.booms >= 3 &&
    m.bounces >= 5 &&
    m.flag &&
    m.secret
  ) {
    m.paid = true;
    useSave.getState().addCoins(60, false);
    live.banner = "أنهيت التحديات · +60";
    live.bannerUntil = performance.now() + 4500;
    say("يا بطل");
    sfx.yay();
  }
}

export function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

