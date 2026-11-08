import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  useSphericalJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { sfx } from "@/game/audio";
import { characterById, colorMat, type Hat } from "@/game/characters";
import { POOL, SPAWN, TRAMPOLINES } from "@/game/level";
import { M } from "@/game/materials";
import {
  clamp,
  dampAngle,
  live,
  noteBounce,
  noteJump,
  publish,
  requestRagdoll,
  say,
  useSave,
  worldApi,
} from "@/game/state";
import { input } from "@/game/input";

const CAP_HH = 0.4;
const CAP_R = 0.32;
const FEET = CAP_HH + CAP_R;

function yawQuat(yaw: number) {
  const h = yaw * 0.5;
  return { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) };
}

function HatMesh({ hat, accent }: { hat: Hat; accent: string }) {
  const prop = useRef<THREE.Group>(null);
  const accentMat = colorMat(accent, 0.45);
  useFrame((_, delta) => {
    if (hat === "propeller" && prop.current) {
      prop.current.rotation.y += delta * (worldApi.speed > 0.5 ? 16 : 3);
    }
  });
  if (hat === "cap") {
    return (
      <group position={[0, 0.72, 0]}>
        <mesh material={accentMat} castShadow>
          <sphereGeometry args={[0.28, 12, 10]} />
        </mesh>
        <mesh position={[0, -0.02, 0.22]} material={accentMat} castShadow>
          <boxGeometry args={[0.34, 0.06, 0.28]} />
        </mesh>
      </group>
    );
  }
  if (hat === "bow") {
    return (
      <group position={[0, 0.74, 0]}>
        <mesh position={[-0.16, 0, 0]} material={accentMat}>
          <sphereGeometry args={[0.12, 8, 8]} />
        </mesh>
        <mesh position={[0.16, 0, 0]} material={accentMat}>
          <sphereGeometry args={[0.12, 8, 8]} />
        </mesh>
        <mesh material={M.gold}>
          <sphereGeometry args={[0.07, 8, 8]} />
        </mesh>
      </group>
    );
  }
  if (hat === "mohawk") {
    return (
      <group position={[0, 0.7, 0]}>
        <mesh position={[0, 0.16, 0]} material={accentMat}>
          <coneGeometry args={[0.1, 0.32, 6]} />
        </mesh>
        <mesh position={[0, 0.12, 0.12]} material={accentMat}>
          <coneGeometry args={[0.08, 0.24, 6]} />
        </mesh>
        <mesh position={[0, 0.12, -0.12]} material={accentMat}>
          <coneGeometry args={[0.08, 0.24, 6]} />
        </mesh>
      </group>
    );
  }
  if (hat === "crown") {
    return (
      <group position={[0, 0.74, 0]}>
        <mesh material={M.gold} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 0.12, 8]} />
        </mesh>
        <mesh position={[0, 0.14, 0]} material={M.gold}>
          <coneGeometry args={[0.08, 0.2, 5]} />
        </mesh>
        <mesh position={[0.16, 0.12, 0]} material={M.gold}>
          <coneGeometry args={[0.06, 0.16, 5]} />
        </mesh>
        <mesh position={[-0.16, 0.12, 0]} material={M.gold}>
          <coneGeometry args={[0.06, 0.16, 5]} />
        </mesh>
      </group>
    );
  }
  return (
    <group ref={prop} position={[0, 0.78, 0]}>
      <mesh material={accentMat}>
        <boxGeometry args={[0.46, 0.06, 0.1]} />
      </mesh>
      <mesh material={M.gold}>
        <sphereGeometry args={[0.06, 8, 8]} />
      </mesh>
    </group>
  );
}

function Character({
  body,
  accent,
  hat,
  legL,
  legR,
  armL,
  armR,
}: {
  body: string;
  accent: string;
  hat: Hat;
  legL: RefObject<THREE.Group | null>;
  legR: RefObject<THREE.Group | null>;
  armL: RefObject<THREE.Group | null>;
  armR: RefObject<THREE.Group | null>;
}) {
  const bodyMat = colorMat(body, 0.48);
  const accentMat = colorMat(accent, 0.45);
  return (
    <group>
      <mesh position={[0, 0.02, 0]} material={bodyMat} castShadow>
        <capsuleGeometry args={[0.28, 0.34, 6, 10]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={bodyMat} castShadow>
        <sphereGeometry args={[0.27, 14, 12]} />
      </mesh>
      <mesh position={[-0.1, 0.54, 0.2]} material={M.white}>
        <sphereGeometry args={[0.07, 8, 8]} />
      </mesh>
      <mesh position={[0.1, 0.54, 0.2]} material={M.white}>
        <sphereGeometry args={[0.07, 8, 8]} />
      </mesh>
      <mesh position={[-0.1, 0.53, 0.26]} material={M.pupil}>
        <sphereGeometry args={[0.035, 8, 8]} />
      </mesh>
      <mesh position={[0.1, 0.53, 0.26]} material={M.pupil}>
        <sphereGeometry args={[0.035, 8, 8]} />
      </mesh>
      <mesh position={[0, 0.4, 0.24]} rotation={[0.2, 0, 0]} material={M.mouth}>
        <torusGeometry args={[0.09, 0.028, 6, 10, Math.PI]} />
      </mesh>
      <mesh position={[-0.16, 0.46, 0.2]} material={M.blush}>
        <sphereGeometry args={[0.045, 6, 6]} />
      </mesh>
      <mesh position={[0.16, 0.46, 0.2]} material={M.blush}>
        <sphereGeometry args={[0.045, 6, 6]} />
      </mesh>
      <group ref={armL} position={[-0.34, 0.12, 0]}>
        <mesh position={[0, -0.16, 0]} material={accentMat} castShadow>
          <capsuleGeometry args={[0.07, 0.22, 4, 6]} />
        </mesh>
      </group>
      <group ref={armR} position={[0.34, 0.12, 0]}>
        <mesh position={[0, -0.16, 0]} material={accentMat} castShadow>
          <capsuleGeometry args={[0.07, 0.22, 4, 6]} />
        </mesh>
      </group>
      <group ref={legL} position={[-0.12, -0.28, 0]}>
        <mesh position={[0, -0.16, 0]} material={M.ink} castShadow>
          <capsuleGeometry args={[0.08, 0.2, 4, 6]} />
        </mesh>
      </group>
      <group ref={legR} position={[0.12, -0.28, 0]}>
        <mesh position={[0, -0.16, 0]} material={M.ink} castShadow>
          <capsuleGeometry args={[0.08, 0.2, 4, 6]} />
        </mesh>
      </group>
      <HatMesh hat={hat} accent={accent} />
    </group>
  );
}

function Part({
  bodyRef,
  position,
  args,
  color,
  rotation,
}: {
  bodyRef: RefObject<RapierRigidBody | null>;
  position: [number, number, number];
  args: [number, number];
  color: string;
  rotation?: [number, number, number];
}) {
  return (
    <RigidBody
      ref={bodyRef}
      position={position}
      colliders={false}
      linearDamping={1.4}
      angularDamping={1.8}
      canSleep={false}
    >
      <CapsuleCollider args={args} rotation={rotation ?? [0, 0, 0]} />
      <mesh material={colorMat(color, 0.5)} castShadow rotation={rotation ?? [0, 0, 0]}>
        <capsuleGeometry args={[args[1], args[0] * 2, 4, 8]} />
      </mesh>
    </RigidBody>
  );
}

function Ragdoll({
  origin,
  vel,
  bodyColor,
  accent,
}: {
  origin: [number, number, number];
  vel: [number, number, number];
  bodyColor: string;
  accent: string;
}) {
  const hip = useRef<RapierRigidBody>(null);
  const spine = useRef<RapierRigidBody>(null);
  const head = useRef<RapierRigidBody>(null);
  const la = useRef<RapierRigidBody>(null);
  const ra = useRef<RapierRigidBody>(null);
  const ll = useRef<RapierRigidBody>(null);
  const rl = useRef<RapierRigidBody>(null);
  const kicked = useRef(false);
  const [ox, oy, oz] = origin;

  useSphericalJoint(hip as RefObject<RapierRigidBody>, spine as RefObject<RapierRigidBody>, [
    [0, 0.22, 0],
    [0, -0.2, 0],
  ]);
  useSphericalJoint(spine as RefObject<RapierRigidBody>, head as RefObject<RapierRigidBody>, [
    [0, 0.24, 0],
    [0, -0.16, 0],
  ]);
  useSphericalJoint(spine as RefObject<RapierRigidBody>, la as RefObject<RapierRigidBody>, [
    [-0.22, 0.12, 0],
    [0, 0.18, 0],
  ]);
  useSphericalJoint(spine as RefObject<RapierRigidBody>, ra as RefObject<RapierRigidBody>, [
    [0.22, 0.12, 0],
    [0, 0.18, 0],
  ]);
  useSphericalJoint(hip as RefObject<RapierRigidBody>, ll as RefObject<RapierRigidBody>, [
    [-0.1, -0.16, 0],
    [0, 0.2, 0],
  ]);
  useSphericalJoint(hip as RefObject<RapierRigidBody>, rl as RefObject<RapierRigidBody>, [
    [0.1, -0.16, 0],
    [0, 0.2, 0],
  ]);

  useFrame(() => {
    const h = hip.current;
    if (!h) return;
    if (!kicked.current) {
      kicked.current = true;
      for (const ref of [hip, spine, head, la, ra, ll, rl]) {
        ref.current?.setLinvel(
          {
            x: vel[0] + (Math.random() - 0.5) * 2,
            y: vel[1] + 1,
            z: vel[2] + (Math.random() - 0.5) * 2,
          },
          true,
        );
      }
    }
    const p = h.translation();
    worldApi.focus.set(p.x, p.y, p.z);
  });

  return (
    <group>
      <Part bodyRef={hip} position={[ox, oy, oz]} args={[0.16, 0.2]} color={bodyColor} />
      <Part bodyRef={spine} position={[ox, oy + 0.46, oz]} args={[0.18, 0.2]} color={accent} />
      <Part bodyRef={head} position={[ox, oy + 0.92, oz]} args={[0.08, 0.18]} color={bodyColor} />
      <Part bodyRef={la} position={[ox - 0.42, oy + 0.5, oz]} args={[0.16, 0.08]} color={accent} />
      <Part bodyRef={ra} position={[ox + 0.42, oy + 0.5, oz]} args={[0.16, 0.08]} color={accent} />
      <Part bodyRef={ll} position={[ox - 0.14, oy - 0.42, oz]} args={[0.18, 0.09]} color={M.ink.color.getStyle()} />
      <Part bodyRef={rl} position={[ox + 0.14, oy - 0.42, oz]} args={[0.18, 0.09]} color={M.ink.color.getStyle()} />
    </group>
  );
}

function nearest(prefix: string, px: number, py: number, pz: number, max: number) {
  let best: { id: string; d: number } | null = null;
  for (const [id, body] of worldApi.bodies) {
    if (!id.startsWith(prefix) || id === worldApi.heldId) continue;
    const p = body.translation();
    const d = Math.hypot(p.x - px, p.y - py, p.z - pz);
    if (d < max && (!best || d < best.d)) best = { id, d };
  }
  return best?.id ?? null;
}

export function Player() {
  const equipped = useSave((s) => s.equipped);
  const char = characterById(equipped);
  const bodyRef = useRef<RapierRigidBody>(null);
  const visual = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const yaw = useRef(0);
  const coyote = useRef(0);
  const buffer = useRef(0);
  const boing = useRef(0);
  const squash = useRef(1);
  const prevVy = useRef(0);
  const splash = useRef(0);
  const registered = useRef(false);
  const { rapier, world } = useRapier();
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }), [rapier]);
  const [doll, setDoll] = useState<{
    id: number;
    pos: [number, number, number];
    vel: [number, number, number];
    until: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      worldApi.bodies.delete("player");
      registered.current = false;
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const body = bodyRef.current;
    if (!body) return;
    if (!registered.current) {
      worldApi.bodies.set("player", body);
      registered.current = true;
      live.ready = true;
      window.__gameReady = true;
      publish();
    }

    if (worldApi.teleport) {
      const t = worldApi.teleport;
      worldApi.teleport = null;
      worldApi.drivingId = null;
      worldApi.heldId = null;
      worldApi.ragdoll = false;
      setDoll(null);
      body.setEnabled(true);
      body.setTranslation({ x: t.x, y: t.y, z: t.z }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      yaw.current = 0;
      worldApi.focus.set(t.x, t.y, t.z);
    }

    if (doll && (performance.now() > doll.until || worldApi.focus.y < -3)) {
      const f = worldApi.focus.y < -3 ? worldApi.safe : worldApi.focus;
      body.setEnabled(true);
      body.setTranslation({ x: f.x, y: Math.max(f.y, 1.1), z: f.z }, true);
      body.setLinvel({ x: 0, y: 3, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      worldApi.ragdoll = false;
      worldApi.ragdollLock = performance.now() + 900;
      setDoll(null);
      return;
    }

    if (worldApi.drivingId) {
      if (body.isEnabled()) body.setEnabled(false);
      return;
    }

    if (worldApi.wantRagdoll && !doll && body.isEnabled()) {
      worldApi.wantRagdoll = false;
      const p = body.translation();
      const v = body.linvel();
      if (worldApi.heldId) {
        const held = worldApi.bodies.get(worldApi.heldId);
        held?.setBodyType(rapier.RigidBodyType.Dynamic, true);
        worldApi.heldId = null;
      }
      worldApi.ragdoll = true;
      body.setEnabled(false);
      setDoll({
        id: performance.now(),
        pos: [p.x, p.y, p.z],
        vel: [v.x, v.y, v.z],
        until: performance.now() + 2200,
      });
      if (live.mode === "chaos") live.chaos += 12;
      say("أوف");
      sfx.bonk();
      worldApi.shake = 0.4;
      return;
    }

    if (doll || !body.isEnabled()) return;

    const p = body.translation();
    if (p.y < -6) {
      const s = SPAWN.free ?? [0, 1.2, 22];
      body.setTranslation({ x: s[0], y: s[1], z: s[2] }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      say("رجعت");
      return;
    }

    ray.origin.x = p.x;
    ray.origin.y = p.y;
    ray.origin.z = p.z;
    const hit = world.castRayAndGetNormal(ray, 1.2, true, undefined, undefined, undefined, body);
    const grounded = !!(hit && hit.timeOfImpact < FEET + 0.22 && hit.normal.y > 0.32);
    const flat = !!(hit && grounded && hit.normal.y > 0.9);
    worldApi.grounded = grounded;
    if (grounded) coyote.current = 0.14;
    else coyote.current -= dt;
    if (flat) worldApi.safe.set(p.x, p.y, p.z);

    let carryX = 0;
    let carryY = 0;
    let carryZ = 0;
    let onMover = false;
    if (grounded) {
      for (const m of worldApi.movers.values()) {
        if (Math.hypot(p.x - m.x, p.z - m.z) < m.r && Math.abs(p.y - (m.y + FEET)) < 0.7) {
          carryX = m.vx;
          carryY = m.vy;
          carryZ = m.vz;
          onMover = true;
          break;
        }
      }
    }

    const active = live.playing && !live.paused;
    const mx = active ? input.moveX : 0;
    const my = active ? input.moveY : 0;
    const cy = worldApi.camYaw;
    const fx = -Math.sin(cy);
    const fz = -Math.cos(cy);
    const rx = Math.cos(cy);
    const rz = -Math.sin(cy);
    let dx = fx * my + rx * mx;
    let dz = fz * my + rz * mx;
    const mag = Math.hypot(dx, dz);
    if (mag > 1) {
      dx /= mag;
      dz /= mag;
    }
    const speed = input.run && active ? 10.2 : 6.35;
    const lv = body.linvel();

    if (active && mag > 0.12) {
      const target = Math.atan2(-dx, -dz);
      yaw.current = dampAngle(yaw.current, target, 14, dt);
    }

    if (!active) {
      body.setLinvel({ x: lv.x * Math.exp(-8 * dt), y: lv.y, z: lv.z * Math.exp(-8 * dt) }, true);
    } else if (grounded && flat) {
      const rate = 1 - Math.exp(-14 * dt);
      const tx = (mag > 0.08 ? dx * speed : 0) + carryX;
      const tz = (mag > 0.08 ? dz * speed : 0) + carryZ;
      body.setLinvel(
        {
          x: lv.x + (tx - lv.x) * rate,
          y: onMover ? carryY : lv.y,
          z: lv.z + (tz - lv.z) * rate,
        },
        true,
      );
    } else if (grounded) {
      body.setLinvel(
        { x: lv.x + dx * 6 * dt + carryX, y: lv.y, z: lv.z + dz * 6 * dt + carryZ },
        true,
      );
    } else {
      let hx = lv.x + dx * 16 * dt;
      let hz = lv.z + dz * 16 * dt;
      const h = Math.hypot(hx, hz);
      if (h > speed) {
        hx = (hx / h) * speed;
        hz = (hz / h) * speed;
      }
      body.setLinvel({ x: hx, y: lv.y, z: hz }, true);
    }

    if (active && input.jumpEdge) buffer.current = 0.14;
    else buffer.current -= dt;
    if (active && buffer.current > 0 && coyote.current > 0) {
      const lv2 = body.linvel();
      body.setLinvel({ x: lv2.x, y: 8.7, z: lv2.z }, true);
      buffer.current = 0;
      coyote.current = 0;
      noteJump();
      sfx.jump();
    } else if (active && !input.prevJump) {
      const lv2 = body.linvel();
      if (lv2.y > 3.4) body.setLinvel({ x: lv2.x, y: 3.4, z: lv2.z }, true);
    }

    if (boing.current > 0) boing.current -= dt;
    const lv3 = body.linvel();
    if (active && grounded && boing.current <= 0 && lv3.y < 5) {
      for (const pad of TRAMPOLINES) {
        if (Math.hypot(p.x - pad.x, p.z - pad.z) < pad.r && p.y < 1.8) {
          body.setLinvel({ x: lv3.x, y: pad.power, z: lv3.z }, true);
          boing.current = 0.4;
          noteBounce();
          say("هبد");
          if (pad.power >= 17) worldApi.shake = 0.22;
          break;
        }
      }
    }

    if (splash.current > 0) splash.current -= dt;
    const lv4 = body.linvel();
    if (
      splash.current <= 0 &&
      Math.abs(p.x - POOL.x) < POOL.hx &&
      Math.abs(p.z - POOL.z) < POOL.hz &&
      p.y < 1.35 &&
      lv4.y < -6
    ) {
      body.setLinvel({ x: lv4.x * 0.4, y: 5.2, z: lv4.z * 0.4 }, true);
      splash.current = 0.6;
      say("طبة");
      worldApi.shake = 0.28;
    }

    if (active && input.interactEdge) {
      if (worldApi.heldId) {
        const held = worldApi.bodies.get(worldApi.heldId);
        if (held) {
          const hy = yaw.current;
          const hx = -Math.sin(hy);
          const hz = -Math.cos(hy);
          const vel = body.linvel();
          held.setBodyType(rapier.RigidBodyType.Dynamic, true);
          held.setGravityScale(1, true);
          held.setLinvel({ x: hx * 13 + vel.x, y: 6.2, z: hz * 13 + vel.z }, true);
          held.setAngvel({ x: 2, y: 3, z: 1 }, true);
          if (live.mode === "chaos") live.chaos += 8;
          say("يا");
        }
        worldApi.heldId = null;
        publish();
      } else {
        const car = nearest("car-", p.x, p.y, p.z, 2.5);
        if (car) {
          worldApi.drivingId = car;
          body.setEnabled(false);
          say("يلا نسوق");
          sfx.yay();
          publish();
        } else {
          const prop = nearest("prop-", p.x, p.y, p.z, 1.75);
          if (prop) {
            const held = worldApi.bodies.get(prop);
            if (held) {
              held.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
              held.setGravityScale(0, true);
              held.setLinvel({ x: 0, y: 0, z: 0 }, true);
              held.setAngvel({ x: 0, y: 0, z: 0 }, true);
              worldApi.heldId = prop;
              publish();
            }
          }
        }
      }
    }

    if (worldApi.heldId && !worldApi.drivingId) {
      const held = worldApi.bodies.get(worldApi.heldId);
      if (!held) worldApi.heldId = null;
      else {
        const hy = yaw.current;
        held.setNextKinematicTranslation({
          x: p.x - Math.sin(hy) * 1.15,
          y: p.y + 0.35,
          z: p.z - Math.cos(hy) * 1.15,
        });
        held.setNextKinematicRotation(yawQuat(hy));
      }
    }

    const after = body.linvel();
    worldApi.speed = Math.hypot(after.x, after.z);
    worldApi.yaw = yaw.current;
    worldApi.focus.set(p.x, p.y, p.z);
    if (grounded && prevVy.current < -7) squash.current = 0.62;
    prevVy.current = after.y;
    squash.current += (1 - squash.current) * (1 - Math.exp(-8 * dt));
    const vis = visual.current;
    if (vis) {
      vis.rotation.y = yaw.current + Math.PI;
      const s = squash.current;
      vis.scale.set(1 + (1 - s) * 0.4, s, 1 + (1 - s) * 0.4);
    }
    const swing = worldApi.speed > 0.45 ? Math.sin(performance.now() / 80) : 0;
    if (legL.current) legL.current.rotation.x = swing * 0.7;
    if (legR.current) legR.current.rotation.x = -swing * 0.7;
    if (armL.current) armL.current.rotation.x = -swing * 0.55;
    if (armR.current) armR.current.rotation.x = swing * 0.55;
  });

  return (
    <>
      <RigidBody
        ref={bodyRef}
        position={SPAWN.free}
        colliders={false}
        mass={3}
        ccd
        canSleep={false}
        lockRotations
        linearDamping={0.15}
        angularDamping={6}
        enabledRotations={[false, false, false]}
        userData={{ id: "player" }}
        onCollisionEnter={(payload) => {
          const me = bodyRef.current;
          if (!me || !me.isEnabled()) return;
          const v = me.linvel();
          if (v.y < -13) requestRagdoll();
          const other = payload.other.rigidBody;
          if (!other || other.handle === me.handle) return;
          const ov = other.linvel();
          if (Math.hypot(ov.x, ov.y, ov.z) > 8.5) requestRagdoll();
        }}
      >
        <CapsuleCollider args={[CAP_HH, CAP_R]} friction={0.2} restitution={0} />
        <group ref={visual} visible={!doll}>
          <Character
            body={char.body}
            accent={char.accent}
            hat={char.hat}
            legL={legL}
            legR={legR}
            armL={armL}
            armR={armR}
          />
        </group>
      </RigidBody>
      {doll ? (
        <Ragdoll
          key={doll.id}
          origin={doll.pos}
          vel={doll.vel}
          bodyColor={char.body}
          accent={char.accent}
        />
      ) : null}
    </>
  );
}
