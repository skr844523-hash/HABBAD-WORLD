import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const GameApp = lazy(() => import("@/game/GameApp"));

export const Route = createFileRoute("/")({ component: Home });

function Boot() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-2 bg-sky px-6 text-center">
      <p className="text-xs font-bold tracking-widest text-primary">HABBAD WORLD</p>
      <h1 className="text-4xl font-black text-ink">عالم الهبد</h1>
      <p className="text-sm text-muted">جهّز الحديقة…</p>
    </div>
  );
}

function Home() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(true);
  }, []);
  return (
    <main className="h-dvh w-full overflow-hidden bg-sky text-ink">
      {on ? (
        <Suspense fallback={<Boot />}>
          <GameApp />
        </Suspense>
      ) : (
        <Boot />
      )}
    </main>
  );
}
