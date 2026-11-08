import { useFrame } from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { input } from "@/game/input";
import {
  BARRELS,
  CARS,
  COINS,
  LIFT,
  PROPS,
  TREES,
  TRAMPOLINES,
  type PropKind,
  type V3,
} from "@/game/level";
import { M } from "@/game/materials";
import {
  clamp,
  collectCoin,
  live,
  noteBoom,
  requestRagdoll,
  worldApi,
  type Mover,
} from "@/game/state";

const SLIDE_FROM: V3 = [-10.2, 11.55, 0.2];
const SLIDE_TO: V3 = [3.1, 0.7, 12.1];
const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10);

function useRegister(id: string, ref: RefObject<RapierRigidBody | null>) {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current && ref.current) {
      worldApi.bodies.set(id, ref.current);
      done.current = true;
    }
  });
  useEffect(
    () => () => {
      worldApi.bodies.delete(id);
      done.current = false;
    },
    [id],
  );
}

function blast(x: number, y: number, z: number, radius: number, impulse: number, skip: string) {
  for (const [id, body] of worldApi.bodies) {
    if (id === skip || body.bodyType() !== 0) continue;
    const p = body.translation();
    const dx = p.x - x;
    const dy = p.y - y;
    const dz = p.z - z;
    const d = Math.hypot(dx, dy, dz);
    if (d > radius || d < 0.05) continue;
    const f = impulse * (1 - d / radius);
    body.applyImpulse({ x: (dx / d) * f, y: f * 0.55, z: (dz / d) * f }, true);
    if (id === "player") requestRagdoll();
  }
}

function rampPose(from: V3, to: V3) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().lerp(b, 0.5);
  const dummy = new THREE.Object3D();
  dummy.position.copy(mid);
  dummy.lookAt(b);
  return { position: mid, quaternion: dummy.quaternion.clone(), dist: Math.max(0.5, a.distanceTo(b)) };
}

function Ramp({
  from,
  to,
  width,
  thickness,
  material,
  friction,
  rails,
}: {
  from: V3;
  to: V3;
  width: number;
  thickness: number;
  material: THREE.Material;
  friction: number;
  rails?: boolean;
}) {
  const pose = useMemo(() => rampPose(from, to), [from, to]);
  return (
    <RigidBody
      type="fixed"
      position={pose.position}
      quaternion={pose.quaternion}
      friction={friction}
      restitution={0}
      colliders="cuboid"
    >
      <mesh material={material} receiveShadow castShadow>
        <boxGeometry args={[width, thickness, pose.dist]} />
      </mesh>
      {rails ? (
        <mesh position={[width * 0.48, 0.28, 0]} material={M.gold} castShadow>
          <boxGeometry args={[0.16, 0.42, pose.dist]} />
        </mesh>
      ) : null}
      {rails ? (
        <mesh position={[-width * 0.48, 0.28, 0]} material={M.gold} castShadow>
          <boxGeometry args={[0.16, 0.42, pose.dist]} />
        </mesh>
      ) : null}
    </RigidBody>
  );
}

function Box({
  position,
  args,
  material,
  friction = 0.8,
}: {
  position: V3;
  args: V3;
  material: THREE.Material;
  friction?: number;
}) {
  return (
    <RigidBody type="fixed" position={position} friction={friction} colliders="cuboid">
      <mesh material={material} castShadow receiveShadow>
        <boxGeometry args={args} />
      </mesh>
    </RigidBody>
  );
}

function MoverPad({
  id,
  color,
  size,
  move,
}: {
  id: string;
  color: THREE.Material;
  size: V3;
  move: (t: number, dt: number) => Mover;
}) {
  const ref = useRef<RapierRigidBody>(null);
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05) || 0.016;
    const m = move(clock.elapsedTime, dt);
    ref.current?.setNextKinematicTranslation({ x: m.x, y: m.y, z: m.z });
    worldApi.movers.set(id, m);
  });
  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders="cuboid" friction={1.4} position={[0, 0.3, 0]}>
      <mesh material={color} castShadow receiveShadow>
        <boxGeometry args={size} />
      </mesh>
    </RigidBody>
  );
}

function Hammer({ position, phase }: { position: V3; phase: number }) {
  const ref = useRef<RapierRigidBody>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const axis = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  useFrame(({ clock }) => {
    const a = Math.sin(clock.elapsedTime * 1.35 + phase) * 1.15;
    q.setFromAxisAngle(axis, a);
    ref.current?.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
  });
  return (
    <RigidBody ref={ref} type="kinematicPosition" position={position} colliders={false}>
      <CuboidCollider args={[1.55, 0.16, 0.16]} position={[1.55, 0, 0]} />
      <mesh position={[1.55, 0, 0]} material={M.red} castShadow>
        <boxGeometry args={[3.1, 0.32, 0.32]} />
      </mesh>
      <mesh material={M.ink} castShadow>
        <sphereGeometry args={[0.28, 10, 10]} />
      </mesh>
    </RigidBody>
  );
}

function Barrel({ id, position }: { id: string; position: V3 }) {
  const ref = useRef<RapierRigidBody>(null);
  useRegister(id, ref);
  const born = useRef(-1);
  const state = useRef({ alive: true, timer: 0 });
  const [homeX, homeY, homeZ] = position;
  const burst = useRef<THREE.Group>(null);
  const bursting = useRef(false);
  const burstT = useRef(0);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const body = ref.current;
    if (!body) return;
    if (born.current < 0) born.current = clock.elapsedTime;
    if (bursting.current && burst.current) {
      burstT.current += dt;
      const t = burstT.current;
      burst.current.children.forEach((c, i) => {
        const a = (i / 6) * Math.PI * 2;
        c.position.set(Math.cos(a) * t * 4, 0.4 + t * 3.2 - t * t * 2.4, Math.sin(a) * t * 4);
        const s = Math.max(0, 1 - t / 0.7);
        c.scale.setScalar(s);
      });
      if (t > 0.75) bursting.current = false;
    }
    if (!state.current.alive) {
      state.current.timer -= dt;
      if (state.current.timer <= 0 && live.mode !== "bowling") {
        state.current.alive = true;
        body.setTranslation({ x: homeX, y: homeY, z: homeZ }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.setEnabled(true);
      }
      return;
    }
    if (clock.elapsedTime - born.current < 0.9) return;
    const v = body.linvel();
    const sp = Math.hypot(v.x, v.y, v.z);
    if (sp > 9.2 && (live.playing || sp > 14)) {
      const p = body.translation();
      state.current.alive = false;
      state.current.timer = 7;
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setTranslation({ x: homeX, y: -40, z: homeZ }, true);
      bursting.current = true;
      burstT.current = 0;
      if (burst.current) burst.current.position.set(p.x, p.y, p.z);
      blast(p.x, p.y, p.z, 4.6, 16, id);
      if (live.playing) noteBoom();
    }
  });

  return (
    <>
      <RigidBody
        ref={ref}
        position={position}
        colliders={false}
        mass={2.3}
        ccd
        friction={0.55}
        restitution={0.12}
        linearDamping={0.25}
      >
        <CylinderCollider args={[0.42, 0.48]} />
        <mesh material={M.barrel} castShadow>
          <cylinderGeometry args={[0.48, 0.48, 0.84, 10]} />
        </mesh>
        <mesh position={[0, 0.12, 0]} material={M.band}>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 10]} />
        </mesh>
        <mesh position={[0, -0.12, 0]} material={M.band}>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 10]} />
        </mesh>
      </RigidBody>
      <group ref={burst}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} material={i % 2 ? M.gold : M.red}>
            <sphereGeometry args={[0.16, 6, 6]} />
          </mesh>
        ))}
      </group>
    </>
  );
}

function Prop({ id, kind, position }: { id: string; kind: PropKind; position: V3 }) {
  const ref = useRef<RapierRigidBody>(null);
  useRegister(id, ref);
  const mass = kind === "bowl" ? 7 : kind === "ball" ? 0.55 : kind === "tire" ? 2 : 1.5;
  return (
    <RigidBody
      ref={ref}
      position={position}
      colliders={false}
      mass={mass}
      ccd
      friction={kind === "ball" ? 0.35 : 0.7}
      restitution={kind === "ball" || kind === "bowl" ? 0.72 : 0.05}
      linearDamping={0.15}
    >
      {kind === "crate" ? <CuboidCollider args={[0.4, 0.4, 0.4]} /> : null}
      {kind === "ball" ? <BallCollider args={[0.42]} /> : null}
      {kind === "bowl" ? <BallCollider args={[0.72]} /> : null}
      {kind === "tire" ? <CylinderCollider args={[0.16, 0.46]} rotation={[Math.PI / 2, 0, 0]} /> : null}
      {kind === "crate" ? (
        <mesh material={M.crate} castShadow>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
        </mesh>
      ) : null}
      {kind === "ball" ? (
        <mesh material={id.endsWith("2") || id.endsWith("4") ? M.ballb : M.ball} castShadow>
          <sphereGeometry args={[0.42, 14, 12]} />
        </mesh>
      ) : null}
      {kind === "bowl" ? (
        <mesh material={M.red} castShadow>
          <sphereGeometry args={[0.72, 16, 12]} />
        </mesh>
      ) : null}
      {kind === "tire" ? (
        <mesh material={M.tire} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.4, 0.16, 8, 14]} />
        </mesh>
      ) : null}
    </RigidBody>
  );
}

function yawToQ(yaw: number) {
  const h = yaw * 0.5;
  return { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) };
}

function Car({ id, position, yaw, color }: { id: string; position: V3; yaw: number; color: string }) {
  const ref = useRef<RapierRigidBody>(null);
  useRegister(id, ref);
  const heading = useRef(yaw);
  const flip = useRef(0);
  const wheels = useRef<THREE.Group>(null);
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.42 }), [color]);
  const q0 = useMemo(() => {
    const h = yaw * 0.5;
    return new THREE.Quaternion(0, Math.sin(h), 0, Math.cos(h));
  }, [yaw]);

  useFrame((_, delta) => {
    const body = ref.current;
    if (!body) return;
    const dt = Math.min(delta, 0.05);
    const r = body.rotation();
    const uy = 1 - 2 * (r.x * r.x + r.z * r.z);
    const driving = worldApi.drivingId === id && live.playing && !live.paused;
    if (driving && uy > 0.78) {
      const lv = body.linvel();
      const fx = -Math.sin(heading.current);
      const fz = -Math.cos(heading.current);
      const rx = Math.cos(heading.current);
      const rz = -Math.sin(heading.current);
      const fwd = lv.x * fx + lv.z * fz;
      const lat = lv.x * rx + lv.z * rz;
      let steer = input.steerOverride ?? -input.moveX;
      steer = clamp(steer, -1, 1);
      const reverse = fwd >= -0.35 ? 1 : -1;
      const factor = clamp(Math.abs(fwd) / 6, 0.28, 1);
      heading.current += steer * 2.15 * factor * reverse * dt;
      const throttle = input.moveY;
      let newFwd = fwd + throttle * 34 * dt;
      if (Math.abs(throttle) < 0.08) newFwd *= Math.exp(-2.4 * dt);
      newFwd = clamp(newFwd, -8, 16);
      const newLat = lat * Math.exp(-12 * dt);
      body.setLinvel(
        { x: fx * newFwd + rx * newLat, y: lv.y, z: fz * newFwd + rz * newLat },
        true,
      );
      body.setRotation(yawToQ(heading.current), true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      const p = body.translation();
      worldApi.focus.set(p.x, p.y, p.z);
      worldApi.yaw = heading.current;
      worldApi.speed = Math.abs(newFwd);
      worldApi.grounded = true;
      if (wheels.current) {
        for (const w of wheels.current.children) w.rotateX(newFwd * dt * 1.4);
      }
      if (input.interactEdge) {
        worldApi.drivingId = null;
        const player = worldApi.bodies.get("player");
        if (player) {
          player.setEnabled(true);
          player.setTranslation({ x: p.x + 1.8, y: p.y + 1.1, z: p.z }, true);
          player.setLinvel({ x: 0, y: 0, z: 0 }, true);
          player.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        }
        input.interactEdge = false;
      }
    } else if (!driving && uy > 0.84) {
      body.setRotation(yawToQ(heading.current), true);
      const av = body.angvel();
      body.setAngvel({ x: 0, y: av.y * 0.9, z: 0 }, true);
      flip.current = 0;
    } else {
      flip.current = uy < 0.5 ? flip.current + dt : 0;
      if (flip.current > 1.25) {
        const p = body.translation();
        body.setTranslation({ x: p.x, y: p.y + 0.8, z: p.z }, true);
        body.setRotation(yawToQ(heading.current), true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.setLinvel({ x: 0, y: 2.2, z: 0 }, true);
        flip.current = 0;
      }
    }
  });

  return (
    <RigidBody
      ref={ref}
      position={position}
      quaternion={q0}
      colliders={false}
      mass={26}
      ccd
      canSleep={false}
      friction={0.85}
      linearDamping={0.35}
      angularDamping={1.2}
    >
      <CuboidCollider args={[0.62, 0.32, 1.15]} position={[0, 0.48, 0]} />
      <group rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.42, 0]} material={paint} castShadow>
          <boxGeometry args={[1.2, 0.38, 2.2]} />
        </mesh>
        <mesh position={[0, 0.78, -0.05]} material={M.white} castShadow>
          <boxGeometry args={[1.02, 0.36, 1.15]} />
        </mesh>
        <mesh position={[0, 0.5, 1.05]} material={M.gold}>
          <boxGeometry args={[0.5, 0.12, 0.12]} />
        </mesh>
        <group ref={wheels}>
          {[
            [-0.62, 0.28, 0.72],
            [0.62, 0.28, 0.72],
            [-0.62, 0.28, -0.72],
            [0.62, 0.28, -0.72],
          ].map((w, i) => (
            <mesh key={i} position={w as V3} rotation={[0, 0, Math.PI / 2]} material={M.tire} castShadow>
              <cylinderGeometry args={[0.24, 0.24, 0.18, 10]} />
            </mesh>
          ))}
        </group>
      </group>
    </RigidBody>
  );
}

function CoinField() {
  const ref = useRef<THREE.Group>(null);
  const hidden = useRef(new Map<string, number>());
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const focus = worldApi.focus;
    const reach = worldApi.drivingId ? 2.1 : 1.25;
    g.children.forEach((child, i) => {
      const spot = COINS[i];
      if (!spot) return;
      const id = "c" + i;
      const back = hidden.current.get(id);
      if (back !== undefined) {
        if (t > back) {
          hidden.current.delete(id);
          child.visible = true;
        } else {
          child.visible = false;
          return;
        }
      }
      child.rotation.y = t * 2.1 + i;
      child.position.y = spot[1] + Math.sin(t * 3 + i) * 0.1;
      if (!live.playing || live.paused || !child.visible) return;
      const dx = focus.x - spot[0];
      const dy = focus.y - child.position.y;
      const dz = focus.z - spot[2];
      if (dx * dx + dy * dy + dz * dz < reach * reach) {
        hidden.current.set(id, t + 16);
        child.visible = false;
        collectCoin(1);
      }
    });
  });
  return (
    <group ref={ref}>
      {COINS.map((p, i) => (
        <group key={i} position={p}>
          <mesh material={M.gold} rotation={[Math.PI / 2, 0, 0]} castShadow geometry={coinGeo} />
        </group>
      ))}
    </group>
  );
}

function RushCoins() {
  const ref = useRef<THREE.Group>(null);
  const acc = useRef(0);
  const seq = useRef(1);
  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    if (live.mode === "coins" && live.playing && !live.paused && g.children.length < 16) {
      acc.current += dt;
      if (acc.current > 1.05) {
        acc.current = 0;
        const mesh = new THREE.Mesh(coinGeo, M.gold);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set((Math.random() - 0.5) * 16, 1.25, 5 + (Math.random() - 0.5) * 14);
        mesh.name = "rush-" + seq.current++;
        g.add(mesh);
      }
    }
    const focus = worldApi.focus;
    for (let i = g.children.length - 1; i >= 0; i--) {
      const c = g.children[i];
      if (!c) continue;
      c.rotation.z = clock.elapsedTime * 3;
      if (!live.playing || live.paused) continue;
      const dx = focus.x - c.position.x;
      const dy = focus.y - c.position.y;
      const dz = focus.z - c.position.z;
      if (dx * dx + dy * dy + dz * dz < 2.2) {
        g.remove(c);
        collectCoin(1);
      }
    }
  });
  return <group ref={ref} />;
}

function Trees() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const dummy = new THREE.Object3D();
    TREES.forEach((p, i) => {
      dummy.position.set(p[0], 1.35 * (p[2] ?? 1), p[1]);
      dummy.scale.setScalar(p[2] ?? 1);
      dummy.rotation.y = i;
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(p[0], 0.45, p[1]);
      dummy.scale.set(0.35, 0.9, 0.35);
      dummy.updateMatrix();
      trunks.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREES.length]}>
        <cylinderGeometry args={[0.28, 0.34, 1, 6]} />
        <primitive object={M.trunk} attach="material" />
      </instancedMesh>
      <instancedMesh ref={ref} args={[undefined, undefined, TREES.length]}>
        <coneGeometry args={[1.05, 2.3, 7]} />
        <primitive object={M.leaf} attach="material" />
      </instancedMesh>
    </group>
  );
}

function Clouds() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      c.position.x += Math.sin(clock.elapsedTime * 0.15 + i) * 0.004;
    });
  });
  const spots: V3[] = [
    [-10, 18, -6],
    [12, 20, 8],
    [0, 22, -18],
    [24, 19, -4],
    [-24, 21, 10],
  ];
  return (
    <group ref={ref}>
      {spots.map((p, i) => (
        <mesh key={i} position={p} material={M.cloud}>
          <sphereGeometry args={[1.6 + (i % 3) * 0.35, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}

export function World() {
  const liftPrev = useRef(0.25);
  return (
    <group>
      <RigidBody type="fixed" position={[0, -0.6, 0]} friction={0.95} colliders="cuboid">
        <mesh receiveShadow material={M.grass}>
          <boxGeometry args={[170, 1.2, 170]} />
        </mesh>
      </RigidBody>
      <mesh position={[0, 0.025, 14]} rotation={[-Math.PI / 2, 0, 0]} material={M.path} receiveShadow>
        <planeGeometry args={[3.2, 18]} />
      </mesh>
      <mesh position={[0, 0.025, 6]} rotation={[-Math.PI / 2, 0, 0]} material={M.path} receiveShadow>
        <circleGeometry args={[6.5, 24]} />
      </mesh>
      <mesh position={[POOL_VIS.x, 0.05, POOL_VIS.z]} rotation={[-Math.PI / 2, 0, 0]} material={M.water}>
        <circleGeometry args={[5.2, 24]} />
      </mesh>

      <RigidBody type="fixed" position={[0, 0.55, 6]} colliders={false} friction={0.6}>
        <CylinderCollider args={[0.55, 1.35]} />
        <mesh material={M.stone} castShadow receiveShadow>
          <cylinderGeometry args={[1.35, 1.5, 1.1, 14]} />
        </mesh>
        <mesh position={[0, 0.7, 0]} material={M.water}>
          <cylinderGeometry args={[1.05, 1.05, 0.25, 14]} />
        </mesh>
      </RigidBody>

      <Box position={[-13.6, 11.55, -2]} args={[7.4, 0.4, 7.2]} material={M.roof} friction={1} />
      {[
        [-16.8, 5.7, -5],
        [-10.4, 5.7, -5],
        [-16.8, 5.7, 1],
        [-10.4, 5.7, 1],
      ].map((p, i) => (
        <RigidBody key={i} type="fixed" position={p as V3} colliders={false}>
          <CylinderCollider args={[5.7, 0.38]} />
          <mesh material={i % 2 ? M.red : M.gold} castShadow>
            <cylinderGeometry args={[0.38, 0.46, 11.4, 8]} />
          </mesh>
        </RigidBody>
      ))}

      <Ramp from={SLIDE_FROM} to={SLIDE_TO} width={4.6} thickness={0.32} material={M.slide} friction={0.035} rails />

      <MoverPad
        id="lift"
        color={M.gold}
        size={[3.1, 0.28, 3.1]}
        move={(t, dt) => {
          const u = (Math.sin(t * 0.42) + 1) / 2;
          const y = 0.25 + u * 11.35;
          const vy = (y - liftPrev.current) / dt;
          liftPrev.current = y;
          return { x: LIFT.x, y, z: LIFT.z, vx: 0, vy, vz: 0, r: 1.55 };
        }}
      />

      <MoverPad
        id="swing-a"
        color={M.platform}
        size={[3.3, 0.26, 2.1]}
        move={(t) => {
          const x = Math.sin(t * 0.9) * 2.4;
          return { x, y: 1.15, z: -16, vx: Math.cos(t * 0.9) * 2.4 * 0.9, vy: 0, vz: 0, r: 1.5 };
        }}
      />
      <MoverPad
        id="swing-b"
        color={M.mint}
        size={[3.1, 0.26, 2]}
        move={(t) => {
          const x = 6 + Math.sin(t * 0.7 + 1) * 2.2;
          return { x, y: 2.35, z: -20, vx: Math.cos(t * 0.7 + 1) * 2.2 * 0.7, vy: 0, vz: 0, r: 1.45 };
        }}
      />
      <MoverPad
        id="slider"
        color={M.red}
        size={[2.2, 0.7, 1.1]}
        move={(t) => {
          const z = 9 + Math.sin(t * 1.1) * 3.2;
          return { x: -2.2, y: 0.45, z, vx: 0, vy: 0, vz: Math.cos(t * 1.1) * 3.2 * 1.1, r: 1.3 };
        }}
      />

      <Hammer position={[7.2, 1.15, 7.4]} phase={0.2} />
      <Hammer position={[4.2, 1.15, -4]} phase={1.4} />

      {TRAMPOLINES.map((pad) => (
        <mesh key={pad.id} position={[pad.x, 0.12, pad.z]} material={M.mint} receiveShadow>
          <cylinderGeometry args={[pad.r, pad.r, 0.22, 16]} />
        </mesh>
      ))}

      {BARRELS.map((p, i) => (
        <Barrel key={i} id={"barrel-" + i} position={p} />
      ))}
      {PROPS.map((p) => (
        <Prop key={p.id} id={p.id} kind={p.kind} position={p.pos} />
      ))}
      {CARS.map((c) => (
        <Car key={c.id} id={c.id} position={c.pos} yaw={c.yaw} color={c.color} />
      ))}

      <Box position={[-34.6, 1.5, -2]} args={[0.8, 3, 7]} material={M.ink} />
      <Box position={[-32, 1.5, -5.6]} args={[6, 3, 0.7]} material={M.roof} />
      <Box position={[-32, 1.5, 1.6]} args={[6, 3, 0.7]} material={M.roof} />
      <Box position={[-32.2, 3.1, -2]} args={[6.2, 0.4, 7.4]} material={M.ink} />
      <mesh position={[-33.2, 1.1, -2]} material={M.crystal}>
        <octahedronGeometry args={[0.55, 0]} />
      </mesh>
      <mesh position={[-30.2, 0.7, -3.4]} material={M.leaf}>
        <sphereGeometry args={[0.7, 8, 8]} />
      </mesh>
      <mesh position={[-29.6, 0.55, -0.4]} material={M.leaf}>
        <sphereGeometry args={[0.55, 8, 8]} />
      </mesh>

      <mesh position={[22, 1.6, -16]} material={M.pole} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 3.2, 8]} />
      </mesh>
      <mesh position={[22.45, 2.7, -16]} material={M.gold} castShadow>
        <boxGeometry args={[0.9, 0.55, 0.08]} />
      </mesh>

      <mesh position={[7, 1.4, 18]} material={M.red} castShadow>
        <coneGeometry args={[2.1, 2.5, 6]} />
      </mesh>
      <mesh position={[-8, 1.5, 22]} material={M.gold} castShadow>
        <coneGeometry args={[1.8, 2.3, 6]} />
      </mesh>
      <RigidBody type="fixed" position={[24, 1.1, 8]} colliders={false}>
        <CylinderCollider args={[1.1, 1.5]} />
        <mesh material={M.platform} castShadow>
          <coneGeometry args={[1.7, 2.2, 6]} />
        </mesh>
      </RigidBody>

      <CoinField />
      <RushCoins />
      <Trees />
      <Clouds />
    </group>
  );
}

const POOL_VIS = { x: 3.2, z: 12.2 };
