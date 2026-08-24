"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RAW_PARTICIPANTS, type Person } from "./participants";

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
      role: (p.role || "").trim(),
      score: p.score,
      name: (p.name || "").trim(),
      kind: p.kind,
      special: p.special,
    });
  }
  return out;
}

function pickWeightedIndex(list: Person[], last?: Person | null) {
  let total = 0;

  const weights = list.map((p) => {
    if (last && p.handle === last.handle) return 0;
    const handle = p.handle.toLowerCase();
    const w = handle === "@elonmusk" || handle === "@joshpkim" ? 2 : 1;
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

function localAvatarSrc(handle?: string, ext: "webp" | "png" = "webp") {
  if (!handle) return `/avatars/default.${ext}`;
  return `/avatars/${handleToSlug(handle)}.${ext}`;
}

// Первый выбор — локальный webp: он в ~10 раз легче png (6.6 МБ -> 0.7 МБ на всю
// колоду) и не зависит от pbs.twimg.com, где ссылки протухают при смене аватарки
// и режутся по referrer. p.image остаётся запасным вариантом в onError.
function avatarSrc(p?: Person | null) {
  if (!p) return "/avatars/default.webp";
  return (p.image || "").trim() || "/avatars/default.webp";
}

function profileUrl(handle: string) {
  return `https://x.com/${handle.replace(/^@/, "")}`;
}

function createMatchScore() {
  return 87 + Math.floor(Math.random() * 13);
}

function buildSharePageUrl(winner: Person) {
  const base = window.location.origin;
  const u = new URL("/r", base);

  u.searchParams.set("handle", winner.handle);
  if (winner.bio) u.searchParams.set("bio", winner.bio);
  if (winner.name) u.searchParams.set("name", winner.name);
  if (winner.special) u.searchParams.set("special", winner.special);
  if (winner.score) u.searchParams.set("score", String(winner.score));
  u.searchParams.set("v", String(Date.now()));

  return u.toString();
}

function buildXIntentUrl(winner: Person) {
  const sharePageUrl = buildSharePageUrl(winner);

  const text =
    `GROK ME matched me with ${winner.handle}${winner.score ? ` — ${winner.score}%` : ""}.\n` +
    (winner.bio ? `${winner.bio}\n\n` : `\n`) +
    `Who are you in the Grok universe?`;

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

// Кэш уже загруженных (или попытанных) картинок.
// Без него preloadOnce создавал new Image() на КАЖДЫЙ вызов, а вызывался он
// в цикле внутри каждого кадра rAF -> ~1500 объектов в секунду.
const preloadedImages = new Set<string>();

function preloadOnce(src: string, timeoutMs = 5000) {
  if (!src) return Promise.resolve();
  if (preloadedImages.has(src)) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = "async";

    // внешние CDN (например Twitter) могут резать по referrer
    if (src.startsWith("http")) img.referrerPolicy = "no-referrer";

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      preloadedImages.add(src); // помечаем даже ошибку, чтобы не ретраить
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);

    img.onload = finish;
    img.onerror = finish;
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
  const COLORS = ["#ffffff", "#73fbd3", "#6c63ff", "#8fb8ff"];

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

    if (t < untilRef.current) spawn(isMobileDevice() ? 3 : 6);

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
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ~1000 частиц с save/restore заметно роняют fps на слабых телефонах
    const heavy = !isMobileDevice();

    untilRef.current = performance.now() + (reduced ? 0 : heavy ? 2200 : 1400);
    spawn(reduced ? 60 : heavy ? 220 : 120);

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

  // One reusable audio element for desktop and mobile.
  useEffect(() => {
    const a = new Audio("/sfx/win.wav"); // public/sfx/win.wav
    a.preload = "auto";
    a.volume = 0.85;
    a.setAttribute("playsinline", "");
    winAudioRef.current = a;

    return () => {
      try {
        a.pause();
      } catch {}
      winAudioRef.current = null;
    };
  }, []);

  function unlockAudioOnce() {
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
    const a = winAudioRef.current;
    if (!a) return;

    try {
      a.pause();
      a.currentTime = 0;
      const playback = a.play();
      if (playback && typeof playback.catch === "function") {
        void playback.catch(() => {
          audioUnlockedRef.current = false;
        });
      }
    } catch {
      audioUnlockedRef.current = false;
    }
  }

  // ===== Reel parameters =====
  const WINDOW = 9;
  const HALF = Math.floor(WINDOW / 2);

  // ВАЖНО: должно совпадать с .bigTile в CSS (desktop и @media max-width: 768px),
  // иначе на мобиле плитки 132px стоят с шагом 224px и карусель выглядит дырявой.
  const DESKTOP_TILE = 200;
  const DESKTOP_GAP = 24;
  const MOBILE_TILE = 132;
  const MOBILE_GAP = 16;

  const stepRef = useRef<number>(DESKTOP_TILE + DESKTOP_GAP);

  // ===== Continuous phase-based reel =====
  const phasePxRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number>(0);

  // refs вместо замыкания на state: tick живёт дольше одного рендера
  const modeRef = useRef<Mode>("idle");
  const peopleLenRef = useRef<number>(people.length);
  const keepIdleMovingRef = useRef<boolean>(false); // держит карусель в движении, пока ждём async

  // ===== Императивные плитки: React не участвует в кадре =====
  const tileElsRef = useRef<Array<HTMLAnchorElement | null>>([]);
  const tileImgsRef = useRef<Array<HTMLImageElement | null>>([]);
  const tileHandlesRef = useRef<Array<string | null>>([]);
  const lastCenterRef = useRef<number>(-1);

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

  useEffect(() => {
    peopleLenRef.current = people.length;
  }, [people.length]);

  useEffect(() => {
    preloadOnce("/avatars/default.webp").then(() => {});
  }, []);

  // ===== Один кадр: пишем стили прямо в DOM =====
  function paint() {
    const len = peopleLenRef.current;
    if (!len) return;

    const STEP = stepRef.current;
    const phase = phasePxRef.current;

    const baseIndex = Math.floor(phase / STEP);
    const offset = -(phase - baseIndex * STEP);
    const locked = modeRef.current === "locked";

    for (let i = 0; i < WINDOW; i++) {
      const el = tileElsRef.current[i];
      if (!el) continue;

      const p = people[mod(baseIndex + (i - HALF), len)];

      const isCenter = i === HALF;
      const x = (i - HALF) * STEP + offset;
      const dist = Math.abs(x) / STEP;

      const pop = locked && isCenter;

      const opacity = locked
        ? isCenter
          ? 1
          : 0.35
        : clamp(1 - dist * 0.14, 0.18, 1);

      el.style.transform =
        "translate3d(" +
        x.toFixed(2) +
        "px, " +
        (pop ? -16 : 0) +
        "px, 0) scale(" +
        (pop ? 1.12 : 1) +
        ")";
      el.style.opacity = String(opacity);
      el.style.zIndex = isCenter ? "10" : "1";

      // src трогаем только когда под плиткой реально сменился человек
      const handle = p?.handle || "";
      if (tileHandlesRef.current[i] !== handle) {
        tileHandlesRef.current[i] = handle;

        const img = tileImgsRef.current[i];
        const src = avatarSrc(p);

        if (img) {
          img.dataset.step = p?.image ? "remote" : "default";
          img.dataset.png = "";
          img.dataset.remote = (p?.image || "").trim();
          if (img.getAttribute("src") !== src) img.src = src;
          img.alt = handle || "avatar";
        }
        el.setAttribute("aria-label", handle || "avatar");
      }
    }

    // Предзагрузка соседей — при смене центра, а не каждый кадр
    const centerIndex = mod(baseIndex, len);
    if (centerIndex !== lastCenterRef.current) {
      lastCenterRef.current = centerIndex;
      for (let d = -HALF - 3; d <= HALF + 3; d++) {
        const pp = people[mod(centerIndex + d, len)];
        if (pp) void preloadOnce(avatarSrc(pp));
      }
    }
  }

  // mode/current поменялись -> React уже снял .animating, докрашиваем кадр
  useEffect(() => {
    modeRef.current = mode;
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, current, ready]);

  // Шаг карусели держим в соответствии с реальным размером плитки
  useEffect(() => {
    const applyMetrics = () => {
      const next =
        window.innerWidth <= 768
          ? MOBILE_TILE + MOBILE_GAP
          : DESKTOP_TILE + DESKTOP_GAP;

      const prev = stepRef.current;
      if (next === prev) return;

      // сохраняем позицию в «индексах», а не в пикселях
      phasePxRef.current = (phasePxRef.current / prev) * next;

      const tw = tweenRef.current;
      if (tw.active) {
        tw.startPhase = (tw.startPhase / prev) * next;
        tw.endPhase = (tw.endPhase / prev) * next;
      }

      stepRef.current = next;
      paint();
    };

    applyMetrics();
    window.addEventListener("resize", applyMetrics);
    return () => window.removeEventListener("resize", applyMetrics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!people.length) return;

    let alive = true;

    (async () => {
      setReady(false);

      const startIndex = (Math.random() * people.length) | 0;
      const startFrac = Math.random();
      phasePxRef.current = (startIndex + startFrac) * stepRef.current;

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
      paint();
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

      // вкладка скрыта — не жжём CPU и не копим dt
      if (typeof document !== "undefined" && document.hidden) {
        lastTRef.current = 0;
        return;
      }

      const len = peopleLenRef.current;
      if (!len) return;

      const STEP = stepRef.current;

      const last = lastTRef.current || t;
      const dt = clamp((t - last) / 1000, 0, 0.05);
      lastTRef.current = t;

      const tw = tweenRef.current;

      if (tw.active) {
        const tt = clamp((t - tw.t0) / tw.dur, 0, 1);
        const e = easeOutCubic(tt);
        phasePxRef.current = tw.startPhase + (tw.endPhase - tw.startPhase) * e;

        if (tt >= 1) {
          phasePxRef.current = tw.endPhase;
          tw.active = false;

          const winner = people[tw.winnerIndex] ?? null;
          const matchedWinner = winner ? { ...winner, score: createMatchScore() } : null;
          lastWinnerRef.current = winner;

          paint(); // финальный кадр карусели ещё в режиме spinning

          setCurrent(matchedWinner);
          setCelebrate(true);
          setSpinning(false);
          setMode("locked"); // pop победителя дорисует effect, уже с CSS-транзишеном
          launch();
          playWin(); // Reuses the preloaded sound on desktop and mobile.

          stopLoop();
          return;
        }
      } else if (modeRef.current === "idle" || keepIdleMovingRef.current) {
        phasePxRef.current += STEP * 0.55 * dt;
      }

      if (phasePxRef.current > 1e12) {
        phasePxRef.current = phasePxRef.current % (len * STEP);
      }

      paint();
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  async function spin() {
    // Must run inside the user's tap so mobile browsers allow the later win sound.
    unlockAudioOnce();

    if (!people.length) return;
    if (!ready) return;
    if (spinning) return;

    setSpinning(true);
    setCelebrate(false);

    // modeRef ставим синхронно: tick читает его в этом же кадре, а state придёт позже
    modeRef.current = "spinning";
    setMode("spinning");

    lastWinnerRef.current = null;
    setCurrent(null);

    startLoop();

    const len = people.length;
    const winnerIndex = pickWeightedIndex(people, lastWinnerRef.current);

    const winner = people[winnerIndex];
    if (winner) preloadOnce(avatarSrc(winner)).then(() => {});

    const STEP = stepRef.current;

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

  // ===== Победитель. Сама карусель рисуется императивно в paint() =====
  const shownPerson = mode === "locked" ? current : null;
  const url = shownPerson ? profileUrl(shownPerson.handle) : "#";
  const isElonMode = shownPerson?.special === "elon";

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

      <div className={`wrap ${isElonMode ? "elonMode" : ""}`}>
        <div className="hero">
          <div className="brandMark" aria-label="Grok Me">
            <span className="brandOrb" aria-hidden="true">
              <img src="/avatars/bot.webp" alt="" />
            </span>
            <span>GROK ME</span>
          </div>
          <div className="tag">THE GROK BOT SOCIAL EXPERIMENT</div>
          <h1>Who are you in the<br />Grok universe?</h1>
          <p className="sub">
            Spin the feed and discover your Grok match.
          </p>
        </div>

        <section className="panel" aria-label="Grok universe match generator">
          <div
            className={`stage ${celebrate ? "celebrate" : ""} ${
              mode !== "locked" ? "animating" : ""
            }`}
            aria-live="polite"
          >
            <div className="congratsText">{isElonMode ? "ELON MODE ACTIVATED" : "NEURAL MATCH FOUND"}</div>

            {showHints && (
              <div className="carouselHintTop">
                Scanning the minds behind Grok
              </div>
            )}

            <div className="bigReel" aria-label="reel">
              <div className="bigReelTrack" role="presentation">
                {Array.from({ length: WINDOW }).map((_, i) => {
                  const isCenter = i === HALF;
                  const allowClick = mode === "locked" && isCenter && !!shownPerson;

                  return (
                    <a
                      key={i}
                      ref={(el) => {
                        tileElsRef.current[i] = el;
                      }}
                      className={`bigTile ${allowClick ? "winner" : ""}`}
                      href={allowClick ? url : undefined}
                      target={allowClick ? "_blank" : undefined}
                      rel={allowClick ? "noreferrer" : undefined}
                      onClick={(e) => {
                        if (!allowClick) e.preventDefault();
                      }}
                      aria-label="avatar"
                    >
                      {/* transform/opacity/src ставит paint() — React их не трогает,
                          поэтому в кадре нет ни одного ре-рендера */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={(el) => {
                          tileImgsRef.current[i] = el;
                        }}
                        alt="avatar"
                        src="/avatars/default.webp"
                        loading="eager"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        draggable={false}
                        onError={(e) => {
                          // webp -> png -> ссылка из participants -> default
                          const img = e.currentTarget as HTMLImageElement;
                          const step = img.dataset.step;

                          if (step === "webp" && img.dataset.png) {
                            img.dataset.step = "png";
                            img.src = img.dataset.png;
                            return;
                          }
                          if (step !== "remote" && step !== "default" && img.dataset.remote) {
                            img.dataset.step = "remote";
                            img.src = img.dataset.remote;
                            return;
                          }
                          if (step !== "default") {
                            img.dataset.step = "default";
                            img.src = "/avatars/default.webp";
                          }
                        }}
                      />
                      {allowClick && (
                        <div className="winnerBadge">{isElonMode ? "ELON MODE" : "MATCH"}</div>
                      )}
                    </a>
                  );
                })}
              </div>

              <div className="bigReelMask" aria-hidden="true"></div>
            </div>

            {showHints && (
              <div className="carouselHintBottom">
                One signal. One match. Infinite curiosity.
              </div>
            )}

            {mode === "locked" && shownPerson && (
              <div className="meta">
                <div className="resultLabel">
                  {shownPerson.kind === "entity"
                    ? `OFFICIAL ENTITY${shownPerson.score ? ` · ${shownPerson.score}%` : ""}`
                    : shownPerson.kind === "supporter"
                      ? `ACTIVE GROK BOT SUPPORTER${shownPerson.score ? ` · ${shownPerson.score}%` : ""}`
                      : `YOUR GROK MATCH${shownPerson.score ? ` · ${shownPerson.score}%` : ""}`}
                </div>
                {shownPerson.name && <div className="personName">{shownPerson.name}</div>}
                <a className="handleLink" href={url} target="_blank" rel="noreferrer">
                  {shownPerson.handle}
                </a>
                <div className="bio">{shownPerson.role || shownPerson.bio || ""}</div>
              </div>
            )}

            {mode !== "locked" && <div className="spacer" />}
          </div>

          <div className="actions">
            <div className="btns">
              <button className="primary" onClick={spin} disabled={!people.length || !ready}>
                {!ready ? "INITIALIZING…" : spinning ? "SCANNING…" : "GROK ME"}
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

        <div className="creatorBadge">
          <a href="https://x.com/0x_fokki" target="_blank" rel="noreferrer" className="creatorRow">
            <span>
              Built by <b>@0x_fokki</b>
            </span>
          </a>

          <a
            href="https://x.com/bot"
            target="_blank"
            rel="noreferrer"
            className="creatorRow"
          >
            <span>
              Built with <b>Grok Bot ↗</b>
            </span>
          </a>

        </div>
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

          /* subtle shadows */
          --shadow: rgba(4, 7, 15, 0.1);
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
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
          background: var(--bg);
          color: var(--text);
          overflow-x: hidden;
        }

        .texture {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
              900px 520px at 58% 10%,
              rgba(216, 245, 140, 0.28),
              transparent 62%
            ),
            radial-gradient(760px 460px at 28% 18%, rgba(216, 245, 140, 0.18), transparent 60%),
            radial-gradient(820px 520px at 76% 14%, rgba(33, 116, 207, 0.06), transparent 66%),
            repeating-linear-gradient(90deg, rgba(4, 7, 15, 0.03) 0 1px, transparent 1px 6px);
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
          color: rgba(4, 7, 15, 0.5);
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
          box-shadow: 0 26px 80px rgba(4, 7, 15, 0.1);
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
          font-weight: 500;
        }

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
            opacity 0.25s ease, box-shadow 0.35s ease, border-color 0.35s ease;
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
          box-shadow: 0 50px 140px rgba(0, 0, 0, 0.22), 0 0 0 3px rgba(216, 245, 140, 0.42),
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
          background: #f2f3f5;
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
          box-shadow: 0 14px 34px rgba(216, 245, 140, 0.45), inset 0 -1px 0 rgba(4, 7, 15, 0.18);
          border: 1px solid rgba(4, 7, 15, 0.12);
        }
        .primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 40px rgba(216, 245, 140, 0.55), inset 0 -1px 0 rgba(4, 7, 15, 0.22);
        }
        .primary:active {
          transform: translateY(0);
          box-shadow: 0 10px 22px rgba(216, 245, 140, 0.45), inset 0 2px 0 rgba(4, 7, 15, 0.25);
        }

        .share {
          background: #fff;
          color: var(--text);
          border: 1px solid rgba(4, 7, 15, 0.14);
          box-shadow: 0 10px 26px rgba(4, 7, 15, 0.06);
        }
        .share:hover {
          box-shadow: 0 12px 30px rgba(4, 7, 15, 0.08), 0 0 0 3px rgba(216, 245, 140, 0.18);
        }

        /* ===== footer ===== */
        .creatorBadge {
          position: fixed;
          right: 20px;
          bottom: 18px;
          z-index: 40;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          line-height: 1;
          flex-direction: row-reverse;
        }
        .creatorRow {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: rgba(4, 7, 15, 0.55);
        }
        .creatorRow:hover {
          color: rgba(4, 7, 15, 0.85);
        }
        .creatorAvatar {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          object-fit: cover;
        }
        .creatorRow b {
          font-weight: 800;
          color: rgba(4, 7, 15, 0.75);
        }

        /* ===== MOBILE ===== */
        @media (max-width: 768px) {
          .wrap {
            padding: 8px 12px 16px; /* ✅ убрали огромный отступ */
          }

          .stage {
            padding: 20px 14px 18px;
            gap: 8px;
          }

          .panel {
            width: 100%;
            margin: 6px auto 0;
            border-radius: 26px;
          }

          .actions {
            padding: 14px 14px 6px;
            padding-bottom: 18px;
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

          /* ✅ footer прямо под карточкой (static) */
          .creatorBadge {
            position: static;
            width: 100%;
            margin: 10px auto 0;
            padding: 0 12px;

            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;

            font-size: 12px;
            line-height: 1;
          }

          .creatorRow {
            white-space: nowrap;
            flex: 0 0 auto;
          }

          .creatorAvatar {
            width: 18px;
            height: 18px;
          }
        }
      `}</style>
      <style jsx global>{`
        :root {
          --bg: #050608;
          --card: rgba(12, 14, 19, 0.92);
          --surface: #0c0e12;
          --text: #f5f7fb;
          --muted: #969daa;
          --line: rgba(255, 255, 255, 0.1);
          --accent: #73fbd3;
          --accent-soft: #b8ffeb;
          --accent-2: #7870ff;
        }

        body {
          background: var(--bg);
          color: var(--text);
          min-height: 100%;
        }

        .texture {
          opacity: 1;
          mix-blend-mode: normal;
          background:
            radial-gradient(850px 520px at 50% -5%, rgba(113, 98, 255, 0.22), transparent 65%),
            radial-gradient(620px 420px at 15% 65%, rgba(35, 197, 170, 0.11), transparent 70%),
            radial-gradient(720px 480px at 92% 82%, rgba(45, 91, 208, 0.13), transparent 72%),
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: auto, auto, auto, 42px 42px, 42px 42px;
        }

        .texture::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.32) .6px, transparent .7px);
          background-size: 19px 19px;
          opacity: .12;
          mask-image: linear-gradient(to bottom, #000, transparent 80%);
        }

        .loadingOverlay {
          background: rgba(5, 6, 8, 0.88);
          color: var(--text);
        }
        .spinner {
          border-color: rgba(255,255,255,.12);
          border-top-color: var(--accent);
        }
        .loadingText { color: var(--muted); }

        .wrap {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px 72px;
        }

        .hero {
          width: min(960px, 100%);
          margin: 0 auto 30px;
          text-align: center;
        }

        .brandMark {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .14em;
        }

        .brandOrb {
          width: 30px;
          height: 30px;
          border: 1px solid var(--line);
          border-radius: 50%;
          display: block;
          overflow: hidden;
          background: #111;
          box-shadow: 0 0 24px rgba(115,251,211,.12);
          letter-spacing: 0;
        }

        .brandOrb img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .tag {
          color: var(--accent);
          margin-bottom: 12px;
          letter-spacing: .22em;
          font-size: 10px;
        }

        h1 {
          color: var(--text);
          font-size: clamp(44px, 6vw, 78px);
          line-height: .96;
          letter-spacing: -.055em;
          font-weight: 500;
          text-wrap: balance;
        }

        .sub {
          color: var(--muted);
          font-size: 15px;
          margin-top: 18px;
          letter-spacing: .01em;
        }

        .panel {
          width: min(1180px, 96vw);
          margin: 0 auto;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: linear-gradient(145deg, rgba(18,21,29,.93), rgba(7,8,11,.96));
          box-shadow: 0 40px 120px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.055);
          backdrop-filter: blur(22px);
        }

        .panel::before {
          height: 1px;
          left: 12%;
          right: 12%;
          background: linear-gradient(90deg, transparent, rgba(115,251,211,.72), transparent);
        }

        .stage {
          padding: 44px 60px 34px;
          gap: 10px;
        }

        .congratsText {
          color: var(--accent);
          letter-spacing: .24em;
          font-size: 10px;
        }

        .carouselHintTop {
          color: rgba(255,255,255,.42);
          letter-spacing: .18em;
          font-size: 10px;
        }
        .carouselHintBottom {
          color: rgba(255,255,255,.42);
          font-size: 12px;
        }

        .bigReel { height: 238px; }

        .bigTile {
          width: 180px;
          height: 180px;
          margin-left: -90px;
          margin-top: -90px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: #0c0e12;
          box-shadow: 0 22px 60px rgba(0,0,0,.45);
        }

        .bigTile::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(145deg, rgba(255,255,255,.08), transparent 32%);
          pointer-events: none;
        }

        .bigTile.winner {
          border-color: rgba(115,251,211,.72);
          box-shadow: 0 30px 90px rgba(0,0,0,.62), 0 0 0 1px rgba(115,251,211,.2), 0 0 42px rgba(115,251,211,.2);
        }

        .winnerBadge {
          left: 10px;
          top: 10px;
          background: rgba(5,8,10,.85);
          color: var(--accent);
          border-color: rgba(115,251,211,.4);
          box-shadow: 0 8px 28px rgba(0,0,0,.4);
          backdrop-filter: blur(8px);
        }

        .bigReelMask {
          background: linear-gradient(90deg, rgba(10,12,16,.98), transparent 24%, transparent 76%, rgba(10,12,16,.98));
          opacity: .86;
        }

        .resultLabel {
          margin-bottom: 8px;
          color: var(--accent);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .22em;
        }

        .personName {
          color: var(--text);
          font-size: clamp(26px, 3vw, 38px);
          font-weight: 700;
          letter-spacing: -.035em;
          line-height: 1.05;
        }

        .handleLink {
          margin-top: 5px;
          color: var(--muted);
          font-size: 17px;
          font-weight: 400;
          letter-spacing: 0;
        }
        .handleLink:hover { color: var(--accent); }

        .bio {
          max-width: 650px;
          margin: 13px auto 0;
          color: #c8c8cb;
          font-size: 17px;
          line-height: 1.5;
        }

        .basedLine { color: rgba(255,255,255,.42); }
        .basedLine a {
          color: var(--accent);
          border-color: rgba(115,251,211,.3);
        }

        .actions {
          padding: 20px 60px 24px;
          border-color: var(--line);
          background: rgba(0,0,0,.18);
        }

        button {
          border-radius: 999px;
          padding: 15px 28px;
          font-size: 13px;
          letter-spacing: .12em;
          transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
        }

        .primary {
          min-width: 184px;
          color: #040806;
          background: var(--accent);
          border-color: rgba(255,255,255,.35);
          box-shadow: 0 14px 42px rgba(115,251,211,.22);
        }
        .primary:hover:not(:disabled) {
          background: var(--accent);
          box-shadow: 0 18px 52px rgba(115,251,211,.34);
          transform: translateY(-2px);
        }

        .share {
          color: var(--text);
          background: rgba(255,255,255,.055);
          border-color: rgba(255,255,255,.16);
          box-shadow: none;
        }
        .share:hover {
          border-color: rgba(115,251,211,.4);
          box-shadow: 0 0 0 3px rgba(115,251,211,.07);
        }

        .elonMode .panel {
          border-color: rgba(255,255,255,.3);
          box-shadow: none;
        }
        .elonMode .panel::before {
          background: linear-gradient(90deg, transparent, #fff, transparent);
        }
        .elonMode .bigTile.winner {
          border-color: rgba(255,255,255,.92);
          box-shadow: 0 0 0 1px rgba(255,255,255,.18);
        }
        .elonMode .congratsText,
        .elonMode .resultLabel { color: #fff; }

        .creatorBadge {
          position: static;
          z-index: auto;
          width: min(1180px, 96vw);
          margin: 16px auto 0;
          padding: 0 8px;
          justify-content: center;
          gap: 18px;
          flex-direction: row;
          color: rgba(255,255,255,.34);
        }
        .creatorRow { color: rgba(255,255,255,.46); }
        .creatorRow:hover { color: var(--accent); }
        .creatorRow b { color: rgba(255,255,255,.78); }
        .disclaimer { font-size: 11px; color: rgba(255,255,255,.28); }

        @media (max-width: 768px) {
          .wrap { padding: 28px 12px 20px; justify-content: flex-start; }
          .hero { margin-bottom: 22px; }
          .brandMark { margin-bottom: 17px; }
          h1 { font-size: clamp(39px, 12vw, 58px); }
          .sub { font-size: 13px; }
          .panel { margin: 0; border-radius: 14px; }
          .stage { padding: 25px 12px 20px; }
          .bigReel { height: 184px; }
          .bigTile {
            width: 126px;
            height: 126px;
            margin-left: -63px;
            margin-top: -63px;
            border-radius: 12px;
          }
          .personName { font-size: 27px; }
          .handleLink { font-size: 14px; }
          .bio { padding: 0 10px; font-size: 14px; }
          .actions { padding: 15px 14px 18px; }
          .creatorBadge {
            margin-top: 13px;
            padding: 0 5px;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px 16px;
          }
          .disclaimer { width: 100%; text-align: center; }
        }
      `}</style>
    </>
  );
}
