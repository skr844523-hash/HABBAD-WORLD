import * as THREE from "three";

function mat(color: string, roughness = 0.62, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export const M = {
  grass: mat("#69d56e", 0.95),
  grassDeep: mat("#3eaf58", 0.95),
  path: mat("#f0cb90", 0.92),
  water: new THREE.MeshStandardMaterial({
    color: "#3ec6ff",
    roughness: 0.18,
    metalness: 0.04,
    transparent: true,
    opacity: 0.72,
  }),
  stone: mat("#ddd6f2", 0.7),
  slide: mat("#ff4f93", 0.32, 0.04),
  gold: mat("#f0b429", 0.42, 0.22),
  red: mat("#e23b4a", 0.48),
  ink: mat("#2a1840", 0.55),
  white: mat("#fffdf8", 0.4),
  black: mat("#1a1224", 0.5),
  pupil: mat("#1a1224", 0.35),
  leaf: mat("#1f9a4a", 0.82),
  trunk: mat("#a86432", 0.88),
  crate: mat("#e08a3c", 0.78),
  tire: mat("#2a2433", 0.62),
  ball: mat("#4cc9f0", 0.28),
  ballb: mat("#ffd23f", 0.28),
  barrel: mat("#d3542a", 0.55),
  band: mat("#f4e1b5", 0.4, 0.18),
  platform: mat("#7c5cff", 0.48),
  mint: mat("#1aa87a", 0.5),
  cloud: mat("#ffffff", 0.9),
  pole: mat("#f7f4ef", 0.45),
  roof: mat("#ff7a3c", 0.6),
  blush: mat("#ff8fab", 0.6),
  crystal: new THREE.MeshStandardMaterial({
    color: "#7af0ff",
    emissive: "#14c8e8",
    emissiveIntensity: 0.55,
    roughness: 0.22,
  }),
  mouth: mat("#c4233a", 0.5),
};
