import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { pumpAudio, syncAudio, unlockAudio } from "@/game/audio";
import { bindInput, input, sampleInput } from "@/game/input";
import { Player } from "@/game/Player";
import { clamp, dampAngle, live, publish, rollDaily, tickSession, togglePause, useHud, useSave, worldApi } from "@/game/state";
import { Ui } from "@/game/Ui";
import { World } from "@/game/world";

function Systems() {
  const acc = useRef(0);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    sampleInput();
    pumpAudio();
    tickSession(dt);
    acc.current += dt;
    if (acc.current > 0.25) {
      acc.current = 0;
      publish();
    }
  }, -20);
  return null;
}

function CameraRig() {
  const yaw = useRef(0);
  const pitch = useRef(0.46);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const sens = useSave.getState().settings.sens;
    yaw.current -= input.camDx * sens;
    pitch.current = clamp(pitch.current + input.camDy * sens, 0.18, 1.05);
    input.camDx = 0;
    input.camDy = 0;
    if (worldApi.drivingId) yaw.current = dampAngle(yaw.current, worldApi.yaw, 4.5, dt);
    worldApi.camYaw = yaw.current;
    const f = worldApi.focus;
    const dist = 7.6;
    const cy = yaw.current;
    const ph = pitch.current;
    const tx = f.x + Math.sin(cy) * Math.cos(ph) * dist;
    const ty = f.y + 1.45 + Math.sin(ph) * dist * 0.72;
    const tz = f.z + Math.cos(cy) * Math.cos(ph) * dist;
    worldApi.shake *= Math.exp(-3.2 * dt);
    const sh = worldApi.shake;
    const cam = state.camera;
    const k = 1 - Math.exp(-7 * dt);
    cam.position.x += (tx - cam.position.x) * k + (Math.random() - 0.5) * sh;
    cam.position.y += (ty - cam.position.y) * k + (Math.random() - 0.5) * sh * 0.5;
    cam.position.z += (tz - cam.position.z) * k;
    look.set(f.x, f.y + 1.05, f.z);
    cam.lookAt(look);
  }, -10);
  return null;
}

function Stage() {
  const epoch = useHud((s) => s.epoch);
  const shadows = useSave((s) => s.settings.shadows);
  return (
    <Canvas
      className="h-full w-full touch-none"
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 8, 32], fov: 58, near: 0.1, far: 190 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#8ecfff");
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.18;
      }}
    >
      <color attach="background" args={["#8ecfff"]} />
      <fog attach="fog" args={["#b7e6ff", 42, 105]} />
      <hemisphereLight args={["#eaf7ff", "#67b86a", 1.25]} />
      <ambientLight intensity={1.45} />
      <directionalLight
        castShadow={shadows}
        position={[24, 34, 12]}
        intensity={3.1}
        color="#fff4dd"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={80}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.0004}
      />
      <Suspense fallback={null}>
        <Physics key={epoch} gravity={[0, -28, 0]} timeStep={1 / 60}>
          <Systems />
          <CameraRig />
          <World />
          <Player />
        </Physics>
      </Suspense>
    </Canvas>
  );
}

export default function GameApp() {
  useEffect(() => {
    rollDaily();
    const settings = useSave.getState().settings;
    syncAudio(settings.music, settings.sfx);
    window.__controlsTest = {
      getYaw: () => worldApi.yaw,
      getSpeed: () => worldApi.speed,
      setKeys: (codes: string[]) => {
        input.qaOverride = new Set(codes);
        live.playing = true;
        live.paused = false;
        live.screen = "play";
        publish();
      },
      setSteer: (v: number) => {
        input.steerOverride = v;
      },
    };
    const offKeys = bindInput(() => togglePause());
    const gesture = () => unlockAudio();
    window.addEventListener("pointerdown", gesture);
    const look = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-control]")) return;
      const cam = e.pointerType === "mouse" || e.clientX > window.innerWidth * 0.4;
      if (!cam) return;
      (e.currentTarget as Window & { __drag?: number }).__drag = e.pointerId;
    };
    return () => {
      offKeys();
      delete window.__controlsTest;
      window.removeEventListener("pointerdown", gesture);
    };
  }, []);

  useEffect(() => {
    const drag = { id: -1, x: 0, y: 0, on: false };
    const down = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-control]")) return;
      const allow = e.pointerType === "mouse" || e.clientX > window.innerWidth * 0.38;
      if (!allow) return;
      drag.id = e.pointerId;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.on = true;
    };
    const move = (e: PointerEvent) => {
      if (!drag.on || e.pointerId !== drag.id) return;
      const sens = useSave.getState().settings.sens;
      input.camDx += (e.clientX - drag.x) * 0.005 * sens;
      input.camDy += (e.clientY - drag.y) * 0.004 * sens;
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === drag.id) drag.on = false;
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div className="game-root relative h-dvh w-full select-none overflow-hidden bg-sky text-ink">
      <div className="absolute inset-0">
        <Stage />
      </div>
      <Ui />
    </div>
  );
}
