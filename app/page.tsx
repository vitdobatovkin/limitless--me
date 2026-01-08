"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RAW_PARTICIPANTS, type Person } from "./participants";

const DEFAULT_BIO = "How limitless are you?";

// ---------- helpers ----------
function sanitize(list: Person[]): Person[] {
  const out: Person[] = [];
  const seen = new Set<string>();

  for (const p of list || []) {
    const handle = (p?.handle || "").trim();
    if (!handle.startsWith("@")) continue;

    const key = handle.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push({
      handle,
      image: (p.image || "").trim(),
      bio: (p.bio || "").trim(),
    });
  }
  return out;
}

const DOUBLE_WEIGHT_HANDLES = new Set<string>([
  "@larionov_al",
  "@nickbailo",
  "@leibovY",
  "@Fink_Big",
  "@JeremyJem",
  "@JacquesWhales",
  "@yemjules",
  "@cjhtech",
  "@Hecrypton",
  "@dimahorshkov",
  "@RMogylnyi",
  "@0xClemm",
]);

function pickWeightedIndex(list: Person[], last?: Person | null) {
  let total = 0;

  const weights = list.map((p) => {
    if (last && p.handle === last.handle) return 0;
    const w = DOUBLE_WEIGHT_HANDLES.has(p.handle) ? 2 : 1;
    total += w;
    return w;
  });

  let r = Math.random() * total;

  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }

  return weights.length - 1;
}


// ✅ единственный детектор мобилки (используем ВЕЗДЕ)
function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth <= 768 ||
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
  );
}

function handleToSlug(handle: string) {
  const raw = (handle || "").trim().replace(/^@/, "").toLowerCase();
  const safe = raw.replace(/[^a-z0-9_]/g, "");
  return safe || "default";
}

function localAvatarSrc(handle?: string) {
  if (!handle) return "/avatars/default.png";
  return `/avatars/${handleToSlug(handle)}.png`;
}

function avatarSrc(p?: Person | null) {
  if (!p) return "/avatars/default.png";
  const img = (p.image || "").trim();
  if (img) return img; // prefer explicit mapping
  return localAvatarSrc(p.handle);
}

function profileUrl(handle: string) {
  return `https://x.com/${handle.replace(/^@/, "")}`;
}

function buildSharePageUrl(winner: { handle: string; bio?: string }) {
  const base = window.location.origin;
  const u = new URL("/r", base);

  u.searchParams.set("handle", winner.handle);
  u.searchParams.set("bio", winner.bio || DEFAULT_BIO);
  u.searchParams.set("v", String(Date.now()));

  return u.toString();
}

function buildXIntentUrl(winner: { handle: string; bio?: string }) {
  const sharePageUrl = buildSharePageUrl(winner);

  const text =
    `I'm limitless as ${winner.handle} 🚀\n` +
    `How limitless are you?\n\n` +
    `Try yourself: https://limitless-me.vercel.app`;

  const intent = new URL("https://x.com/intent/post");
  intent.searchParams.set("text", text);
  intent.searchParams.set("url", sharePageUrl);
  return intent.toString();
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function preloadOnce(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

// ===== CONFETTI (fullscreen) =====
type ConfettiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  alpha: number;
  fade: number;
  color: string;
};

function useFullscreenConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const untilRef = useRef<number>(0);
  const partsRef = useRef<ConfettiParticle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      partsRef.current = [];
    };
  }, []);

  const rand = (min: number, max: number) => Math.random() * (max - min) + min;
  const COLORS = ["#04070F", "#D8F58C", "#2174CF", "#FFFFFF"];

  const spawn = (count: number) => {
    for (let i = 0; i < count; i++) {
      partsRef.current.push({
        x: rand(0, window.innerWidth),
        y: rand(-window.innerHeight * 0.6, -10),
        vx: rand(-0.8, 0.8),
        vy: rand(2.2, 5.4),
        g: rand(0.015, 0.035),
        w: rand(5, 10),
        h: rand(6, 16),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.18, 0.18),
        alpha: 1,
        fade: rand(0.004, 0.01),
        color: COLORS[(Math.random() * COLORS.length) | 0],
      });
    }
  };

  const tick = (t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (t < untilRef.current) spawn(6);

    const next: ConfettiParticle[] = [];
    for (const p of partsRef.current) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.alpha = Math.max(0, p.alpha - p.fade);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();

      if (
        p.alpha > 0 &&
        p.y < window.innerHeight + 60 &&
        p.x > -60 &&
        p.x < window.innerWidth + 60
      ) {
        next.push(p);
      }
    }
    partsRef.current = next;

    if (t < untilRef.current || partsRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      rafRef.current = null;
      partsRef.current = [];
    }
  };

  const launch = () => {
    untilRef.current = performance.now() + 2200;
    spawn(220);
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  };

  return { canvasRef, launch };
}

type Mode = "idle" | "spinning" | "locked";

export default function HomePage() {
  const people = useMemo(() => sanitize(RAW_PARTICIPANTS), []);
  const { canvasRef, launch } = useFullscreenConfetti();

  // winner only (locked)
  const [current, setCurrent] = useState<Person | null>(null);

  const [celebrate, setCelebrate] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");

  // loader gate
  const [ready, setReady] = useState(false);

  const lastWinnerRef = useRef<Person | null>(null);

  // ===== WIN SOUND =====
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  // ✅ init win sound ONLY on desktop (на мобиле вообще не создаём Audio)
  useEffect(() => {
    if (isMobileDevice()) return;

    const a = new Audio("/sfx/win.wav"); // public/sfx/win.wav
    a.preload = "auto";
    a.volume = 0.85;
    winAudioRef.current = a;

    return () => {
      try {
        a.pause();
      } catch {}
      winAudioRef.current = null;
    };
  }, []);

  function unlockAudioOnce() {
    // ✅ на мобиле никогда не анлочим
    if (isMobileDevice()) return;

    if (audioUnlockedRef.current) return;
    const a = winAudioRef.current;
    if (!a) return;

    audioUnlockedRef.current = true;

    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof (p as any).then === "function") {
        (p as Promise<void>)
          .then(() => {
            a.pause();
            a.currentTime = 0;
          })
          .catch(() => {
            audioUnlockedRef.current = false;
          });
      } else {
        a.pause();
        a.currentTime = 0;
      }
    } catch {
      audioUnlockedRef.current = false;
    }
  }

  function playWin() {
    // ✅ звук ВСЕГДА OFF на мобиле
    if (isMobileDevice()) return;

    const a = winAudioRef.current;
    if (!a) return;

    try {
      a.pause();
      a.currentTime = 0;
      void a.play();
    } catch {}
  }

  // ===== Reel parameters (smaller tiles ~16-18%) =====
  const TILE = 200;
  const GAP = 24;
  const STEP = TILE + GAP;

  const WINDOW = 9;
  const HALF = Math.floor(WINDOW / 2);

  // ===== Continuous phase-based reel =====
  const phasePxRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number>(0);

  const tweenRef = useRef<{
    active: boolean;
    startPhase: number;
    endPhase: number;
    t0: number;
    dur: number;
    winnerIndex: number;
  }>({
    active: false,
    startPhase: 0,
    endPhase: 0,
    t0: 0,
    dur: 0,
    winnerIndex: 0,
  });

  const [, forceFrame] = useState(0);

  useEffect(() => {
    preloadOnce("/avatars/default.png").then(() => {});
  }, []);

  useEffect(() => {
    if (!people.length) return;

    let alive = true;

    (async () => {
      setReady(false);

      const startIndex = (Math.random() * people.length) | 0;
      const startFrac = Math.random();
      phasePxRef.current = (startIndex + startFrac) * STEP;

      // preload стартового окна
      const R = 18;
      const tasks: Promise<void>[] = [];
      for (let d = -R; d <= R; d++) {
        const p = people[mod(startIndex + d, people.length)];
        if (p) tasks.push(preloadOnce(avatarSrc(p)));
      }
      await Promise.all(tasks);

      if (!alive) return;

      setCurrent(null);
      setReady(true);
      startLoop();
    })();

    return () => {
      alive = false;
      stopLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people.length]);

  function stopLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTRef.current = 0;
  }

  function startLoop() {
    if (rafRef.current) return;

    const tick = (t: number) => {
      rafRef.current = requestAnimationFrame(tick);

      const len = people.length;
      if (!len) return;

      const last = lastTRef.current || t;
      const dt = clamp((t - last) / 1000, 0, 0.05);
      lastTRef.current = t;

      if (tweenRef.current.active) {
        const tw = tweenRef.current;
        const tt = clamp((t - tw.t0) / tw.dur, 0, 1);
        const e = easeOutCubic(tt);
        phasePxRef.current = tw.startPhase + (tw.endPhase - tw.startPhase) * e;

        if (tt >= 1) {
          phasePxRef.current = tw.endPhase;
          tweenRef.current.active = false;

          const winner = people[tw.winnerIndex];
          lastWinnerRef.current = winner ?? null;

          setCurrent(winner ?? null);
          setCelebrate(true);
          setSpinning(false);
          setMode("locked");
          launch();
          playWin(); // ✅ WIN SOUND (desktop only)

          stopLoop();
          return;
        }
      } else {
        if (mode === "idle") {
          const speedPx = STEP * 0.55;
          phasePxRef.current += speedPx * dt;
        }
      }

      if (phasePxRef.current > 1e12) {
        phasePxRef.current = phasePxRef.current % (len * STEP);
      }

      // preload вокруг центра (без setState)
      const baseIndex = Math.floor(phasePxRef.current / STEP);
      const centerIndex = mod(baseIndex, len);
      for (let d = -12; d <= 12; d++) {
        const pp = people[mod(centerIndex + d, len)];
        if (pp) preloadOnce(avatarSrc(pp)).then(() => {});
      }

      forceFrame((x) => (x + 1) % 1_000_000);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  async function spin() {
    // ✅ на мобиле ничего не делаем со звуком
    unlockAudioOnce();

    if (!people.length) return;
    if (!ready) return;
    if (spinning) return;

    setSpinning(true);
    setCelebrate(false);
    setMode("spinning");
    lastWinnerRef.current = null;
    setCurrent(null);

    startLoop();

    const len = people.length;
    const winnerIndex = pickWeightedIndex(people, lastWinnerRef.current);


    const winner = people[winnerIndex];
    if (winner) preloadOnce(avatarSrc(winner)).then(() => {});

    const startPhase = phasePxRef.current;
    const startBase = Math.floor(startPhase / STEP);

    // центр в рендере = baseIndex
    const currentCenterIndex = mod(startBase, len);
    const forward = mod(winnerIndex - currentCenterIndex, len);
    const loops = 2 + ((Math.random() * 3) | 0);

    // SNAP: endPhase кратен STEP => победитель строго по центру
    let endBase = startBase + forward;
    let endPhase = endBase * STEP;

    if (endPhase <= startPhase) {
      endBase += len;
      endPhase = endBase * STEP;
    }

    endBase += loops * len;
    endPhase = endBase * STEP;

    tweenRef.current = {
      active: true,
      startPhase,
      endPhase,
      t0: performance.now(),
      dur: 2000 + loops * 520,
      winnerIndex,
    };
  }

  function onShare() {
    const w = lastWinnerRef.current;
    if (!w) return;
    window.open(buildXIntentUrl(w), "_blank", "noopener,noreferrer");
  }

  // ===== Derive center from phase (no state lag) =====
  const len = people.length;
  const phase = phasePxRef.current;

  const baseIndex = Math.floor(phase / STEP);
  const fracPx = phase - baseIndex * STEP;
  const offset = -fracPx;

  const centerPerson = len ? people[mod(baseIndex, len)] : null;
  const shownPerson = mode === "locked" ? current : centerPerson;
  const url = shownPerson ? profileUrl(shownPerson.handle) : "#";

  // ✅ подсказки показываем всегда когда не locked (возвращаются при повторном спине)
  const showHints = mode !== "locked";

  return (
    <>
      <div className="texture" aria-hidden="true"></div>
      <canvas ref={canvasRef} id="confetti" aria-hidden="true"></canvas>

      {!ready && (
        <div className="loadingOverlay" aria-label="Loading avatars">
          <div className="spinner" />
          <div className="loadingText">Loading avatars…</div>
        </div>
      )}

      <div className="wrap">
        <div className="hero">
          <div className="tag">LIMITLESS EDITION</div>
          <h1>How limitless are you?</h1>
          <p className="sub">
            Tap <b>Limitless me</b> — quick spin and we'll discover your limitless potential
          </p>
        </div>

        <section className="panel" aria-label="Based generator">
          <div
            className={`stage ${celebrate ? "celebrate" : ""} ${
              mode !== "locked" ? "animating" : ""
            }`}
            aria-live="polite"
          >
            <div className="congratsText">Congratulations</div>

            {showHints && (
              <div className="carouselHintTop">
                Spinning through limitless creators and builders
              </div>
            )}

            <div className="bigReel" aria-label="reel">
              <div className="bigReelTrack" role="presentation">
                {Array.from({ length: WINDOW }).map((_, i) => {
                  const virtualIndex = baseIndex + (i - HALF);
                  const idx = len ? mod(virtualIndex, len) : 0;
                  const p = people[idx];

                  const x = (i - HALF) * STEP + offset;
                  const dist = Math.abs(x) / STEP;

                  const isCenter = i === HALF;
                  const allowClick =
                    mode === "locked" && isCenter && !!shownPerson;

                  const popScale = allowClick ? 1.12 : 1;
                  const popY = allowClick ? -16 : 0;

                  const opacity =
                    mode === "locked"
                      ? isCenter
                        ? 1
                        : 0.35
                      : clamp(1 - dist * 0.14, 0.18, 1);

                  return (
                    <a
                      key={i}
                      className={`bigTile ${allowClick ? "winner" : ""}`}
                      href={allowClick ? url : undefined}
                      target={allowClick ? "_blank" : undefined}
                      rel={allowClick ? "noreferrer" : undefined}
                      onClick={(e) => {
                        if (!allowClick) e.preventDefault();
                      }}
                      style={{
                        transform: `translate3d(${x}px, ${popY}px, 0) scale(${popScale})`,
                        opacity,
                        zIndex: isCenter ? 10 : 1,
                      }}
                      aria-label={p?.handle || "avatar"}
                    >
                      <img
                        alt={p?.handle || "avatar"}
                        src={avatarSrc(p)}
                        loading="eager"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/avatars/default.png";
                        }}
                      />
                      {allowClick && <div className="winnerBadge">WINNER</div>}
                    </a>
                  );
                })}
              </div>

              <div className="bigReelMask" aria-hidden="true"></div>
            </div>

            {showHints && (
              <div className="carouselHintBottom">
                Spin to discover your limitless match
              </div>
            )}

            {mode === "locked" && shownPerson && (
              <div className="meta">
                <a
                  className="handleLink"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shownPerson.handle}
                </a>
                <div className="bio">{shownPerson.bio || ""}</div>
                {celebrate && (
                  <div className="basedLine">
                    You are limitless as{" "}
                    <a href={url} target="_blank" rel="noreferrer">
                      {shownPerson.handle}
                    </a>
                  </div>
                )}
              </div>
            )}

            {mode !== "locked" && <div className="spacer" />}
          </div>

          <div className="actions">
            <div className="btns">
              <button
                className="primary"
                onClick={spin}
                disabled={!people.length || !ready}
              >
                {!ready ? "Loading…" : spinning ? "Spinning…" : "Limitless me"}
              </button>

              <button
                className="share"
                onClick={onShare}
                style={{ display: mode === "locked" ? "inline-block" : "none" }}
              >
                Share on X
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="creatorBadge">
  <a
    href="https://github.com/vitdobatovkin/nextjs-boilerplate"
    target="_blank"
    rel="noreferrer"
    className="creatorRow"
  >
    <span>
      Built with <b>Next.js</b>
    </span>
  </a>
</div>


      <style jsx global>{`
        :root {
          --bg: #f2f3f5;
          --card: #ffffff;

          --text: #04070f;
          --muted: #51504e;

          --line: #e6e8eb;

          --lime: #d8f58c;
          --lime-strong: #d3f77a;
          --lime-ink: #0a0b0d;

          --brand-blue: #2174cf;

          /* primary button */
          --primary: #04070f;
          --primaryText: #ffffff;

          /* subtle shadows */
          --shadow: rgba(4, 7, 15, 0.10);
        }
        * {
          box-sizing: border-box;
        }
        html,
        body {
          height: 100%;
        }
        body {
          margin: 0;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto,
            Arial;
          background: var(--bg);
          color: var(--text);
          overflow-x: hidden;
        }
        .texture {
            position: fixed;
            inset: 0;
            pointer-events: none;
            background:
              radial-gradient(900px 520px at 58% 10%, rgba(216, 245, 140, 0.28), transparent 62%),
              radial-gradient(760px 460px at 28% 18%, rgba(216, 245, 140, 0.18), transparent 60%),
              radial-gradient(820px 520px at 76% 14%, rgba(33, 116, 207, 0.06), transparent 66%),
              repeating-linear-gradient(
                90deg,
                rgba(4, 7, 15, 0.03) 0 1px,
                transparent 1px 6px
              );
            opacity: 0.75;
            mix-blend-mode: multiply;
        }
        #confetti {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 25;
        }

        /* Loader */
        .loadingOverlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(6px);
        }
        .spinner {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 3px solid rgba(10, 10, 10, 0.12);
          border-top-color: rgba(0, 0, 255, 0.85);
          animation: spin 0.9s linear infinite;
        }
        .loadingText {
          font-size: 13px;
          color: rgba(10, 10, 10, 0.65);
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .wrap {
          min-height: 100%;
          display: grid;
          place-items: center;
          padding: 28px 18px 44px;
        }
        .hero {
          width: min(980px, 100%);
          margin-bottom: 18px;
        }
        .tag {
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(4, 7, 15, 0.50);
          margin-bottom: 10px;
          text-align: center;
          font-weight: 800;
        }
        h1 {
          margin: 0;
          font-size: clamp(40px, 4.6vw, 72px);
          line-height: 0.94;
          letter-spacing: -0.03em;
          font-weight: 900;
          text-align: center;
        }
        .sub {
          margin: 12px auto 0;
          max-width: 75ch;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.45;
          text-align: center;
        }
        .panel {
          width: min(1240px, 96vw);
          margin: 44px auto 0;
          border: 1px solid var(--line);
          border-radius: 32px;
          background: var(--card);
          overflow: hidden;
          box-shadow: 0 26px 80px rgba(4, 7, 15, 0.10);
          position: relative;
        }
        .panel::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: var(--line);
}

        button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px rgba(216, 245, 140, 0.45);
        }

        .primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 18px 40px rgba(216, 245, 140, 0.55),
    inset 0 -1px 0 rgba(4, 7, 15, 0.22);
}
.primary:active {
  transform: translateY(0);
  box-shadow:
    0 10px 22px rgba(216, 245, 140, 0.45),
    inset 0 2px 0 rgba(4, 7, 15, 0.25);
}
        .share:hover {
          box-shadow: 0 12px 30px rgba(4, 7, 15, 0.08), 0 0 0 3px rgba(216, 245, 140, 0.18);
        }
        .carouselHintTop {
          color: rgba(4, 7, 15, 0.55);
        }

        .carouselHintTop b,
        .carouselHintBottom b {
          background: linear-gradient(0deg, rgba(216,245,140,0.65), rgba(216,245,140,0.65));
          padding: 0 4px;
          border-radius: 6px;
        }
        .stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 62px 72px 46px; 
          text-align: center;
          position: relative;
        }
        .congratsText {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.55);
          height: 18px;
          opacity: 0;
          transition: opacity 0.18s ease;
        }
        .stage.celebrate .congratsText {
          opacity: 1;
        }

        /* Copy around carousel */
        .carouselHintTop {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.45);
          margin-bottom: 6px;
        }
        .carouselHintBottom {
          font-size: 14px;
          color: rgba(10, 10, 10, 0.55);
          margin-top: 6px;
          letter-spacing: normal;
          text-transform: none;
          font-weight: 500;
        }

        /* ===== REEL ===== */
        .bigReel {
          width: min(1180px, 96vw);
          height: 270px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bigReelTrack {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bigTile {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200px;
          height: 200px;
          margin-left: -100px;
          margin-top: -100px;

          border-radius: 40px;
          overflow: hidden;
          border: 1px solid rgba(10, 10, 10, 0.1);
          background: var(--card);
          box-shadow: 0 18px 52px rgba(0, 0, 0, 0.08);

          display: block;
          will-change: transform, opacity;

          transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
            opacity 0.25s ease, box-shadow 0.35s ease,
            border-color 0.35s ease;
        }
        .stage.animating .bigTile {
          transition: none !important;
        }

        .bigTile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .bigTile.winner {
          border-color: rgba(4, 7, 15, 0.18);
          box-shadow:
            0 50px 140px rgba(0, 0, 0, 0.22),
            0 0 0 3px rgba(216, 245, 140, 0.42),
            0 0 0 10px rgba(216, 245, 140, 0.16);
        }

        .winnerBadge {
            position: absolute;
            left: 12px;
            top: 12px;
            padding: 7px 10px;
            border-radius: 999px;
            background: var(--lime);
            color: var(--lime-ink);
            font-size: 10px;
            font-weight: 950;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            border: 1px solid rgba(4, 7, 15, 0.14);
            box-shadow: 0 12px 26px rgba(216, 245, 140, 0.32);
        }

        .bigReelMask {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 28px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.94),
            rgba(255, 255, 255, 0) 22%,
            rgba(255, 255, 255, 0) 78%,
            rgba(255, 255, 255, 0.94)
          );
          opacity: 0.68;
        }

        .meta {
          margin-top: 10px;
        }
        .handleLink {
          display: inline-block;
          text-decoration: none;
          color: var(--text);
          font-size: 44px;
          font-weight: 950;
          letter-spacing: -0.04em;
          line-height: 1.02;
        }
        .bio {
          margin-top: 14px;
          font-size: 18px;
          color: var(--muted);
          line-height: 1.65;
        }
        .basedLine {
          margin-top: 10px;
          font-size: 14px;
          color: rgba(10, 10, 10, 0.55);
        }
        .basedLine a {
          color: rgba(10, 10, 10, 0.85);
          text-decoration: none;
          font-weight: 950;
          border-bottom: 1px solid rgba(10, 10, 10, 0.18);
        }
        .spacer {
          height: 1px;
        }

        .actions {
          display: flex;
          padding: 24px 72px 28px;
          border-top: 1px solid var(--line);
          background: #f2f3f5; /* или var(--bg) */
          justify-content: center;
          align-items: center;
        }
        .btns {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          gap: 12px;
          flex-wrap: wrap;
        }
        button {
          border: 1px solid transparent;
          border-radius: 16px;
          padding: 14px 22px;
          font-weight: 950;
          cursor: pointer;
          font-size: 16px;
          letter-spacing: -0.01em;
        }
        .primary {
  background: var(--lime);
  color: #0a0b0d;
  box-shadow:
    0 14px 34px rgba(216, 245, 140, 0.45),
    inset 0 -1px 0 rgba(4, 7, 15, 0.18);
  border: 1px solid rgba(4, 7, 15, 0.12);
}

        .primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .share {
  background: #fff;
  color: var(--text);
  border: 1px solid rgba(4, 7, 15, 0.14);
  box-shadow: 0 10px 26px rgba(4, 7, 15, 0.06);
}

        /* creator badge */
        .creatorBadge {
          position: fixed;
          right: 20px;
          bottom: 18px;
          z-index: 40;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          line-height: 1;
        }
        .creatorRow {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: rgba(10, 10, 10, 0.55);
        }
        .creatorRow:hover {
          color: rgba(10, 10, 10, 0.85);
        }
        .creatorAvatar {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          object-fit: cover;
        }
        .creatorRow b {
          font-weight: 800;
          color: rgba(10, 10, 10, 0.75);
        }
        .baseJoin {
          position: relative;
          padding-left: 14px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          color: rgba(10, 10, 10, 0.45);
        }
        .baseJoin::before {
          content: "·";
          position: absolute;
          left: 4px;
          color: rgba(10, 10, 10, 0.35);
        }
        .baseJoin:hover {
          color: rgba(10, 10, 10, 0.8);
        }
@media (max-width: 768px) {
  /* ===== общий мобильный лейаут ===== */
  .wrap {
    padding: 8px 12px 16px; /* ❗ БЫЛО 20px сверху */
  }

  .stage {
    padding: 20px 14px 18px;
    gap: 8px;
  }

  /* ===== ПАНЕЛЬ ===== */
  .panel {
    width: 100%;
    margin: 6px auto 0;
    border-radius: 26px;
  }

  /* ===== КНОПКИ ===== */
  .actions {
    padding: 14px 14px 6px;
  }

  .bigReel {
    height: 200px;
    width: 100%;
  }

  .bigTile {
    width: 132px;
    height: 132px;
    margin-left: -66px;
    margin-top: -66px;
    border-radius: 30px;
  }

  .handleLink {
    font-size: 26px;
  }

  .bio {
    font-size: 14px;
  }

  /* ===== FOOTER (STICKY) ===== */
  .creatorBadge {
    position: sticky; /* ✅ было relative */
    bottom: env(safe-area-inset-bottom); /* ✅ */
    z-index: 40; /* ✅ чтобы не пряталось */

    width: 100%;
    margin: 2px auto 0;
    padding: 8px 12px calc(10px + env(safe-area-inset-bottom)); /* ✅ чуть паддинг сверху, чтобы выглядело как бар */

    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;

    font-size: 12px;
    line-height: 1;
    pointer-events: auto;

    background: transparent;
  }

  .creatorRow,
  .baseJoin {
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .creatorAvatar {
    width: 18px;
    height: 18px;
  }

  .baseJoin {
    padding-left: 0;
    font-weight: 600;
    color: rgba(10, 10, 10, 0.45);
  }

  .baseJoin::before {
    display: none;
  }
}




      `}</style>
    </>
  );
}
