import {
  Car,
  Check,
  Coins,
  Flag,
  Footprints,
  Pause,
  Play,
  RotateCcw,
  Settings,
  ShoppingBag,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { setMusicEnabled, setSfxEnabled, sfx } from "@/game/audio";
import { CHARACTERS, characterById } from "@/game/characters";
import { input } from "@/game/input";
import {
  DAILY,
  backToMenu,
  live,
  openScreen,
  restartRound,
  say,
  startGame,
  togglePause,
  useHud,
  useSave,
  type Mode,
} from "@/game/state";

function Btn({
  children,
  onClick,
  tone = "primary",
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "primary" | "gold" | "ghost" | "mint" | "ink";
  label?: string;
}) {
  const tones = {
    primary: "bg-primary text-primary-ink",
    gold: "bg-gold text-gold-ink",
    ghost: "bg-paper text-ink",
    mint: "bg-mint text-mint-ink",
    ink: "bg-ink text-paper",
  } as const;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`ui-pop flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink px-3 text-base font-bold transition-transform duration-150 active:translate-y-0.5 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function CoinPill() {
  const coins = useSave((s) => s.coins);
  return (
    <div className="flex items-center gap-1 rounded-full border-2 border-ink bg-gold px-3 py-1 text-sm font-black text-gold-ink">
      <Coins className="size-4" />
      {coins}
    </div>
  );
}

function MenuCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-stretch justify-start p-3">
      <div className="pointer-events-auto max-h-full min-h-0 w-full max-w-md overflow-y-auto rounded-2xl border-2 border-ink bg-card p-4 shadow-poster">
        {children}
      </div>
    </div>
  );
}

function DailyCard() {
  const dayCoins = useSave((s) => s.dayCoins);
  const dayBooms = useSave((s) => s.dayBooms);
  const dayJumps = useSave((s) => s.dayJumps);
  const claimed = useSave((s) => s.claimed);
  const claimDaily = useSave((s) => s.claimDaily);
  const rows = [
    ["عملات", dayCoins, DAILY.coins],
    ["براميل", dayBooms, DAILY.booms],
    ["قفزات", dayJumps, DAILY.jumps],
  ] as const;
  const ready = dayCoins >= DAILY.coins && dayBooms >= DAILY.booms && dayJumps >= DAILY.jumps;
  return (
    <div className="mt-3 rounded-xl border-2 border-line bg-paper p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-black">تحديات اليوم</p>
        <span className="text-xs font-bold text-muted">+{DAILY.reward}</span>
      </div>
      <ul className="space-y-1 text-sm">
        {rows.map(([name, value, goal]) => (
          <li key={name} className="flex items-center justify-between gap-2">
            <span>{name}</span>
            <span className="font-bold">
              {Math.min(value, goal)}/{goal}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={!ready || claimed}
        onClick={() => {
          if (claimDaily()) sfx.yay();
        }}
        className="mt-2 h-10 w-full rounded-lg border-2 border-ink bg-mint text-sm font-bold text-mint-ink disabled:opacity-50"
      >
        {claimed ? "استلمت جائزة اليوم" : "استلم الجائزة"}
      </button>
    </div>
  );
}

function Modes() {
  const bestChaos = useSave((s) => s.bestChaos);
  const bestRush = useSave((s) => s.bestRush);
  const bestBowl = useSave((s) => s.bestBowl);
  const modes: { id: Mode; title: string; detail: string; tone: "primary" | "gold" | "mint" | "ink" }[] = [
    { id: "free", title: "لعب حر", detail: "استكشف الحديقة على كيفك", tone: "primary" },
    { id: "challenge", title: "التحديات", detail: "خمس مهام وجائزة 60", tone: "gold" },
    { id: "chaos", title: "وضع الفوضى", detail: `75 ثانية · أفضل نتيجة ${bestChaos}`, tone: "ink" },
    { id: "coins", title: "مطر العملات", detail: `45 ثانية · أفضل نتيجة ${bestRush}`, tone: "mint" },
    { id: "bowling", title: "بولينغ البراميل", detail: `أسقط البراميل · أفضل نتيجة ${bestBowl}`, tone: "gold" },
  ];
  return (
    <MenuCard>
      <Header title="اختَر الوضع" onBack={() => openScreen("menu")} />
      <div className="mt-3 flex flex-col gap-2">
        {modes.map((m) => (
          <Btn key={m.id} tone={m.tone} onClick={() => startGame(m.id)}>
            <span className="flex w-full flex-col items-start">
              <span>{m.title}</span>
              <span className="text-xs font-medium opacity-80">{m.detail}</span>
            </span>
          </Btn>
        ))}
      </div>
    </MenuCard>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-2xl font-black">{title}</h2>
      <button type="button" onClick={onBack} className="h-10 rounded-lg border-2 border-ink bg-paper px-3 text-sm font-bold">
        رجوع
      </button>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block size-8 rounded-full border-2 border-ink" style={{ background: color }} />;
}

function Characters() {
  const owned = useSave((s) => s.owned);
  const equipped = useSave((s) => s.equipped);
  const equip = useSave((s) => s.equip);
  return (
    <MenuCard>
      <Header title="الشخصيات" onBack={() => openScreen("menu")} />
      <ul className="mt-3 flex flex-col gap-2">
        {CHARACTERS.map((c) => {
          const has = owned.includes(c.id);
          return (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border-2 border-line bg-paper p-2">
              <div className="flex items-center gap-2">
                <Swatch color={c.body} />
                <div>
                  <p className="font-black">{c.name}</p>
                  <p className="text-xs text-muted">{c.blurb}</p>
                </div>
              </div>
              {has ? (
                <button
                  type="button"
                  onClick={() => equip(c.id)}
                  className="h-10 rounded-lg border-2 border-ink bg-gold px-3 text-sm font-bold text-gold-ink"
                >
                  {equipped === c.id ? "يرتديها" : "ارتدِ"}
                </button>
              ) : (
                <span className="text-xs font-bold text-muted">{c.price} عملة</span>
              )}
            </li>
          );
        })}
      </ul>
    </MenuCard>
  );
}

function Shop() {
  const owned = useSave((s) => s.owned);
  const coins = useSave((s) => s.coins);
  const spend = useSave((s) => s.spend);
  const unlock = useSave((s) => s.unlock);
  return (
    <MenuCard>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">المتجر</h2>
        <CoinPill />
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {CHARACTERS.filter((c) => c.price > 0).map((c) => {
          const has = owned.includes(c.id);
          return (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border-2 border-line bg-paper p-2">
              <div className="flex items-center gap-2">
                <Swatch color={c.body} />
                <div>
                  <p className="font-black">{c.name}</p>
                  <p className="text-xs text-muted">{c.blurb}</p>
                </div>
              </div>
              {has ? (
                <span className="text-sm font-bold text-mint">عندك</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (coins < c.price || !spend(c.price)) {
                      say("العملات ما تكفي");
                      return;
                    }
                    unlock(c.id);
                    sfx.yay();
                  }}
                  className="h-10 rounded-lg border-2 border-ink bg-primary px-3 text-sm font-bold text-primary-ink"
                >
                  {c.price}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3">
        <Btn tone="ghost" onClick={() => openScreen("menu")}>
          رجوع
        </Btn>
      </div>
    </MenuCard>
  );
}

function SettingsPanel() {
  const settings = useSave((s) => s.settings);
  const patch = useSave((s) => s.patchSettings);
  const resetSave = useSave((s) => s.resetSave);
  const [arm, setArm] = useState(false);
  return (
    <MenuCard>
      <Header title="الإعدادات" onBack={() => openScreen("menu")} />
      <div className="mt-3 flex flex-col gap-2">
        <Btn
          tone={settings.music ? "mint" : "ghost"}
          onClick={() => {
            const music = !settings.music;
            patch({ music });
            setMusicEnabled(music);
          }}
        >
          {settings.music ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          الموسيقى {settings.music ? "شغّالة" : "مطفية"}
        </Btn>
        <Btn
          tone={settings.sfx ? "mint" : "ghost"}
          onClick={() => {
            const on = !settings.sfx;
            patch({ sfx: on });
            setSfxEnabled(on);
          }}
        >
          المؤثرات {settings.sfx ? "شغّالة" : "مطفية"}
        </Btn>
        <Btn
          tone={settings.shadows ? "gold" : "ghost"}
          onClick={() => patch({ shadows: !settings.shadows })}
        >
          الظلال {settings.shadows ? "عالية" : "خفيفة"}
        </Btn>
        <div className="grid grid-cols-3 gap-2">
          {[
            [0.7, "هادئ"],
            [1, "عادي"],
            [1.45, "سريع"],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => patch({ sens: Number(value) })}
              className={`h-11 rounded-lg border-2 border-ink text-sm font-bold ${settings.sens === value ? "bg-ink text-paper" : "bg-paper text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Btn
          tone="ghost"
          onClick={() => {
            if (!arm) {
              setArm(true);
              return;
            }
            resetSave();
            setArm(false);
          }}
        >
          {arm ? "تأكيد مسح التقدم" : "مسح التقدم"}
        </Btn>
      </div>
    </MenuCard>
  );
}

function MainMenu() {
  const ready = useHud((s) => s.ready);
  return (
    <MenuCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-widest text-primary">HABBAD WORLD</p>
          <h1 className="text-4xl font-black leading-none">عالم الهبد</h1>
        </div>
        <CoinPill />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        حديقة فيزياء للعبث. ادفع الصناديق، ارمِ الكرات، اطلع بالمصعد، انزل الزحليقة، وقد السيارة، وفجّر البراميل الوهمية.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <Btn tone="primary" label="ابدأ اللعب Start" onClick={() => startGame("free")}>
          <Play className="size-5" />
          ابدأ اللعب
          <span className="sr-only">Start</span>
        </Btn>
        <Btn tone="gold" onClick={() => openScreen("modes")}>
          <Sparkles className="size-5" />
          أوضاع اللعب
        </Btn>
        <div className="grid grid-cols-3 gap-2">
          <Btn tone="ghost" onClick={() => openScreen("chars")}>
            <Users className="size-4" />
            شخصيات
          </Btn>
          <Btn tone="ghost" onClick={() => openScreen("shop")}>
            <ShoppingBag className="size-4" />
            متجر
          </Btn>
          <Btn tone="ghost" onClick={() => openScreen("settings")}>
            <Settings className="size-4" />
            إعدادات
          </Btn>
        </div>
      </div>
      <DailyCard />
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {ready
          ? "على الكمبيوتر: WASD حركة، مسافة قفز، Shift جري، E تفاعل، واسحب لتدوير الكاميرا."
          : "جهّز الحديقة…"}
      </p>
    </MenuCard>
  );
}

function Goal({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm font-bold">
      <span className={`flex size-5 items-center justify-center rounded-full border-2 border-ink ${ok ? "bg-mint text-mint-ink" : "bg-paper"}`}>
        {ok ? <Check className="size-3" /> : null}
      </span>
      {text}
    </li>
  );
}

function Hud() {
  const mode = useHud((s) => s.mode);
  const mission = useHud((s) => s.mission);
  const chaos = useHud((s) => s.chaos);
  const timeLeft = useHud((s) => s.timeLeft);
  const mini = useHud((s) => s.mini);
  const banner = useHud((s) => s.banner);
  const bark = useHud((s) => s.bark);
  const held = useHud((s) => s.held);
  const driving = useHud((s) => s.driving);
  const paused = useHud((s) => s.paused);
  const charName = characterById(useSave((s) => s.equipped)).name;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <CoinPill />
          <div className="rounded-full border-2 border-ink bg-card px-3 py-1 text-xs font-bold">{charName}</div>
        </div>
        <button
          type="button"
          data-control
          onClick={togglePause}
          className="pointer-events-auto flex size-12 touch-none items-center justify-center rounded-full border-2 border-ink bg-card"
          aria-label="إيقاف"
        >
          <Pause className="size-5" />
        </button>
      </div>

      <div className="mx-auto mt-1 max-w-sm rounded-xl border-2 border-ink bg-card/95 px-3 py-2 shadow-poster">
        <p className="flex items-center gap-2 text-sm font-black">
          {mode === "chaos" ? <Zap className="size-4" /> : null}
          {mode === "coins" ? <Timer className="size-4" /> : null}
          {mode === "bowling" ? <Trophy className="size-4" /> : null}
          {mode === "challenge" ? <Flag className="size-4" /> : null}
          {mode === "free" ? <Footprints className="size-4" /> : null}
          {mode === "free" && "لعب حر"}
          {mode === "chaos" && `فوضى ${chaos} · ${timeLeft}ث`}
          {mode === "coins" && `عملات ${mini} · ${timeLeft}ث`}
          {mode === "bowling" && `براميل ${mini} · ${timeLeft}ث`}
          {mode === "challenge" && "التحديات"}
        </p>
        {mode === "challenge" ? (
          <ul className="mt-2 space-y-1">
            <Goal ok={mission.coins >= 8} text={`اجمع 8 عملات (${mission.coins})`} />
            <Goal ok={mission.booms >= 3} text={`فجّر 3 براميل (${mission.booms})`} />
            <Goal ok={mission.bounces >= 5} text={`5 قفزات ترامبولين (${mission.bounces})`} />
            <Goal ok={mission.flag} text="أوصل سيارة إلى العلم" />
            <Goal ok={mission.secret} text="ادخل الكهف السري" />
          </ul>
        ) : (
          <p className="mt-1 text-xs text-muted">
            {driving ? "تقود الآن · تفاعل للنزول · يسار ويمين للانعطاف" : held ? "امسكته · تفاعل للرمي" : "تفاعل يمسك أو يركب أو يرمي"}
          </p>
        )}
        {driving && mode === "challenge" ? (
          <p className="mt-1 flex items-center gap-1 text-xs font-bold">
            <Car className="size-3" />
            قُد نحو العلم الذهبي
          </p>
        ) : null}
      </div>

      {banner ? (
        <div className="mx-auto mt-2 w-fit rounded-full border-2 border-ink bg-gold px-4 py-2 text-sm font-black text-gold-ink">
          {banner}
        </div>
      ) : null}
      {bark ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-5xl font-black text-primary">{bark}</p>
      ) : null}

      <div className="game-controls-left pointer-events-auto absolute bottom-4 left-4 touch-none select-none" data-control>
        <Joystick />
      </div>
      <div className="game-controls-right pointer-events-auto absolute bottom-4 right-4 flex flex-col gap-2 touch-none select-none" data-control>
        <HoldButton label="قفز" onHold={(v) => (input.jumpHeld = v)} tone="bg-primary text-primary-ink" />
        <HoldButton label="جري" onHold={(v) => (input.runHeld = v)} tone="bg-gold text-gold-ink" />
        <button
          type="button"
          data-control
          onPointerDown={(e) => {
            e.preventDefault();
            input.interactQueued = true;
          }}
          className="flex h-14 w-16 touch-none select-none items-center justify-center rounded-2xl border-2 border-ink bg-mint text-xs font-black text-mint-ink"
        >
          تفاعل
        </button>
      </div>

      {paused ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-ink bg-card p-4 shadow-poster">
            <h2 className="text-2xl font-black">إيقاف</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Btn tone="primary" onClick={togglePause}>
                <Play className="size-5" />
                متابعة
              </Btn>
              <Btn tone="gold" onClick={restartRound}>
                <RotateCcw className="size-5" />
                إعادة
              </Btn>
              <Btn tone="ghost" onClick={backToMenu}>
                القائمة
              </Btn>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HoldButton({ label, onHold, tone }: { label: string; onHold: (v: boolean) => void; tone: string }) {
  return (
    <button
      type="button"
      data-control
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      className={`flex h-14 w-16 touch-none select-none items-center justify-center rounded-2xl border-2 border-ink text-xs font-black ${tone}`}
    >
      {label}
    </button>
  );
}

function Joystick() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const setFrom = (el: HTMLDivElement, clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect();
    let x = (clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (clientY - (r.top + r.height / 2)) / (r.height / 2);
    const mag = Math.hypot(x, y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    const dz = 0.16;
    const m = Math.hypot(x, y);
    if (m < dz) {
      input.joyX = 0;
      input.joyY = 0;
      setKnob({ x: 0, y: 0 });
      return;
    }
    const s = (m - dz) / ((1 - dz) * m);
    input.joyX = x * s;
    input.joyY = -y * s;
    setKnob({ x: x * 36, y: y * 36 });
  };
  return (
    <div
      data-control
      className="pointer-events-auto relative flex size-32 touch-none select-none items-center justify-center rounded-full border-2 border-ink bg-card/80"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setFrom(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        setFrom(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerUp={() => {
        input.joyX = 0;
        input.joyY = 0;
        setKnob({ x: 0, y: 0 });
      }}
      onPointerCancel={() => {
        input.joyX = 0;
        input.joyY = 0;
        setKnob({ x: 0, y: 0 });
      }}
    >
      <div
        className="size-12 rounded-full border-2 border-ink bg-primary"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}

export function Ui() {
  const screen = useHud((s) => s.screen);
  if (live.playing || screen === "play") return <Hud />;
  if (screen === "modes") return <Modes />;
  if (screen === "chars") return <Characters />;
  if (screen === "shop") return <Shop />;
  if (screen === "settings") return <SettingsPanel />;
  return <MainMenu />;
}
