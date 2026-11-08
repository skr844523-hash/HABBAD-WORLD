export type V3 = [number, number, number];

export const SPAWN: Record<string, V3> = {
  free: [0, 1.15, 22],
  challenge: [0, 1.15, 20],
  chaos: [0, 1.15, 16],
  coins: [0, 1.15, 11],
  bowling: [8, 1.15, 21],
};

export const FLAG = { x: 22, z: -16, r: 3.1 };
export const SECRET = { x: -33.2, z: -2, r: 2.4 };
export const POOL = { x: 3.2, z: 12.2, hx: 4.6, hz: 4.2 };

export const TRAMPOLINES = [
  { id: "t1", x: 10, z: 0, r: 1.65, power: 12 },
  { id: "t2", x: 15, z: -6, r: 1.65, power: 15 },
  { id: "t3", x: 10, z: -12, r: 1.85, power: 18 },
];

export const LIFT = { x: -19.35, z: -2 };

export const COINS: V3[] = [
  [3.4, 1.15, 6],
  [-3.4, 1.15, 6],
  [0, 1.15, 2.6],
  [2.6, 1.15, 8.6],
  [-2.6, 1.15, 8.6],
  [4.8, 1.2, 4],
  [-4.8, 1.2, 4],
  [0, 1.3, 14],
  [6, 1.2, 14],
  [-6, 1.2, 16],
  [10, 1.5, 0],
  [15, 1.5, -6],
  [10, 1.6, -12],
  [22, 1.3, -16],
  [18, 1.2, -12],
  [16, 1.3, 8],
  [-8, 1.2, 10],
  [-13.5, 12.3, -2],
  [-12, 12.3, 0.6],
  [-15, 12.3, -3.6],
  [-31.5, 1.3, -2],
  [-33.4, 1.3, -3.2],
  [-33.4, 1.3, -0.6],
  [-35, 1.5, -2],
  [2, 2.2, -16],
  [7, 2.4, -20],
  [-2, 1.2, -10],
  [26, 1.2, 6],
];

export const BARRELS: V3[] = [
  [14, 0.58, 12],
  [15.8, 0.58, 12],
  [17.6, 0.58, 12],
  [14, 0.58, 13.8],
  [15.8, 0.58, 13.8],
  [17.6, 0.58, 13.8],
  [14, 0.58, 15.6],
  [15.8, 0.58, 15.6],
];

export type PropKind = "crate" | "ball" | "tire" | "bowl";

export const PROPS: { id: string; kind: PropKind; pos: V3 }[] = [
  { id: "prop-crate-1", kind: "crate", pos: [2.2, 0.45, 12] },
  { id: "prop-crate-2", kind: "crate", pos: [-3.2, 0.45, 14] },
  { id: "prop-crate-3", kind: "crate", pos: [5.5, 0.45, 8] },
  { id: "prop-crate-4", kind: "crate", pos: [-1.2, 0.45, -8] },
  { id: "prop-crate-5", kind: "crate", pos: [20, 0.45, 4] },
  { id: "prop-ball-1", kind: "ball", pos: [1.2, 0.55, 4.5] },
  { id: "prop-ball-2", kind: "ball", pos: [-2.2, 0.55, 9] },
  { id: "prop-ball-3", kind: "ball", pos: [4.2, 0.55, 16] },
  { id: "prop-ball-4", kind: "ball", pos: [8, 0.55, 6] },
  { id: "prop-ball-5", kind: "ball", pos: [3, 1.2, 13] },
  { id: "prop-tire-1", kind: "tire", pos: [-5, 0.5, 6] },
  { id: "prop-tire-2", kind: "tire", pos: [7.5, 0.5, 18] },
  { id: "prop-bowl", kind: "bowl", pos: [10.5, 0.9, 17.5] },
];

export const CARS: { id: string; pos: V3; yaw: number; color: string }[] = [
  { id: "car-a", pos: [-6.5, 0.55, 17], yaw: 0.4, color: "#e23b4a" },
  { id: "car-b", pos: [-12.5, 0.55, 13], yaw: -0.6, color: "#1a8fdb" },
];

export const TREES: [number, number, number][] = [
  [-8, 24, 0.9],
  [8, 26, 1.1],
  [18, 24, 0.85],
  [-20, 20, 1],
  [28, 16, 1.15],
  [30, 4, 0.9],
  [28, -8, 1],
  [24, -22, 1.05],
  [8, -24, 0.95],
  [-8, -24, 1.1],
  [-22, -18, 0.9],
  [-36, 8, 1.2],
  [-36, -12, 1],
  [34, 22, 0.8],
  [-28, 22, 1],
  [14, -24, 0.88],
  [-16, 26, 1.05],
  [22, 22, 0.92],
];
