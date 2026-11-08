import * as THREE from "three";

export type Hat = "cap" | "bow" | "mohawk" | "propeller" | "crown";

export type CharacterDef = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  body: string;
  accent: string;
  hat: Hat;
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: "habbad",
    name: "هبّاد",
    blurb: "البطل الأصلي وضحكة الحديقة",
    price: 0,
    body: "#ffd23f",
    accent: "#e23b4a",
    hat: "cap",
  },
  {
    id: "lulu",
    name: "لولو",
    blurb: "تقفز أعلى من الترامبولين",
    price: 50,
    body: "#ff8fab",
    accent: "#7c5cff",
    hat: "bow",
  },
  {
    id: "boom",
    name: "بوم",
    blurb: "صديق البراميل الوهمية",
    price: 100,
    body: "#ff7a3c",
    accent: "#2a1840",
    hat: "mohawk",
  },
  {
    id: "nuno",
    name: "نونو",
    blurb: "طيّار الزحليقة العملاقة",
    price: 170,
    body: "#4cc9f0",
    accent: "#f0b429",
    hat: "propeller",
  },
  {
    id: "zizo",
    name: "زيزو",
    blurb: "ملك الفوضى والتاج",
    price: 260,
    body: "#b388ff",
    accent: "#1aa87a",
    hat: "crown",
  },
];

export function characterById(id: string) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

const cache = new Map<string, THREE.MeshStandardMaterial>();

export function colorMat(color: string, roughness = 0.5) {
  const key = color + roughness;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness });
    cache.set(key, m);
  }
  return m;
}
