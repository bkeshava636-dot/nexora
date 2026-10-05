import { useEffect, useRef, useState } from "react";
import { useIsFetching, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { CheckCircle2, Layers3, RotateCcw, WifiOff } from "lucide-react";

// Stage thresholds in milliseconds
const STAGE_1_MS = 2500;  // 0-10s stage begins after initial 2.5s grace period
const STAGE_2_MS = 10000; // 10-30s
const STAGE_3_MS = 30000; // 30-60s
const STAGE_4_MS = 60000; // 60s+

function isConnectivityError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof TypeError) return true;
  const err = error as { name?: string; status?: number; message?: string };
  if (typeof err.status === "number" && (err.status === 0 || err.status >= 502)) return true;
  const message = (err.message ?? "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("network request failed")
  );
}

function hasActiveConnectivityError(queryClient: QueryClient): boolean {
  return queryClient.getQueryCache().getAll().some((query) => {
    if (!query.isActive()) return false;
    if (query.state.status !== "error" || query.state.data !== undefined) return false;
    return isConnectivityError(query.state.error);
  });
}

// Curated miniature doodles revealed on notebook click
const DOODLES = [
  // 1. Star
  (
    <g key="star" className="stroke-[hsl(var(--secondary))] fill-[hsl(var(--secondary)/.2)]">
      <polygon points="175,123 177,128 182,128 178,131 180,136 175,133 170,136 172,131 168,128 173,128" />
    </g>
  ),
  // 2. Paper Airplane
  (
    <g key="plane" className="stroke-[hsl(var(--foreground))] fill-none stroke-[1.2]">
      <path d="M168,134 L182,124 L173,135 L171,131 Z" />
      <path d="M173,135 L175,130" />
    </g>
  ),
  // 3. Mini Sun
  (
    <g key="sun" className="stroke-[hsl(var(--secondary))] fill-none stroke-[1.2]">
      <circle cx="175" cy="129" r="4" fill="hsl(var(--secondary)/.25)" />
      <line x1="175" y1="122" x2="175" y2="124" />
      <line x1="175" y1="134" x2="175" y2="136" />
      <line x1="168" y1="129" x2="170" y2="129" />
      <line x1="180" y1="129" x2="182" y2="129" />
    </g>
  ),
  // 4. Academic Cap
  (
    <g key="cap" className="stroke-[hsl(var(--foreground))] fill-none stroke-[1.2]">
      <polygon points="175,124 183,128 175,132 167,128" fill="hsl(var(--foreground)/.1)" />
      <path d="M170,129.5 L170,134 C170,135.5 180,135.5 180,134 L180,129.5" />
      <line x1="183" y1="128" x2="183" y2="133" stroke="hsl(var(--secondary))" />
    </g>
  ),
  // 5. Friendly Smile
  (
    <g key="smile" className="stroke-[hsl(var(--foreground))] fill-none stroke-[1.4]">
      <circle cx="171.5" cy="126" r="0.8" fill="currentColor" />
      <circle cx="178.5" cy="126" r="0.8" fill="currentColor" />
      <path d="M170.5,130.5 Q175,134.5 179.5,130.5" strokeLinecap="round" />
    </g>
  ),
];

export function ApiWakeOverlay() {
  const queryClient = useQueryClient();

  // Active query status - only queries with NO cached data trigger the wake overlay
  const fetching = useIsFetching({
    predicate: (query) => query.state.data === undefined && query.state.fetchStatus === "fetching",
  });
  const isWaiting = fetching > 0;
  const connectivityError = !isWaiting && hasActiveConnectivityError(queryClient);

  // Offline detection
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== "undefined" ? !navigator.onLine : false));
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Progression & stage tracking
  const [stage, setStage] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [hold, setHold] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Interactive desk states
  const [lampOn, setLampOn] = useState(true);
  const [isPenClicked, setIsPenClicked] = useState(false);
  const [doodleIndex, setDoodleIndex] = useState(0);
  const [isCatPetted, setIsCatPetted] = useState(false);

  // Timeouts ref
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // Monitor waiting state & stages
  useEffect(() => {
    if (!isWaiting) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      // If we were showing the wake overlay, transition out with success completion
      if (stage > 0 || hold) {
        setIsSuccess(true);
        setProgressPercent(100);
        const exitTimer = setTimeout(() => {
          setIsExiting(true);
          const closeTimer = setTimeout(() => {
            setHold(false);
            setStage(0);
            setIsSuccess(false);
            setIsExiting(false);
            setProgressPercent(0);
            setStartTime(null);
          }, 240);
          timersRef.current.push(closeTimer);
        }, 320);
        timersRef.current.push(exitTimer);
      } else {
        setStage(0);
        setStartTime(null);
      }
      return;
    }

    // Started waiting
    setStartTime(Date.now());
    setIsSuccess(false);
    setIsExiting(false);

    const t1 = setTimeout(() => setStage(1), STAGE_1_MS);
    const t2 = setTimeout(() => setStage(2), STAGE_2_MS);
    const t3 = setTimeout(() => setStage(3), STAGE_3_MS);
    const t4 = setTimeout(() => setStage(4), STAGE_4_MS);

    timersRef.current = [t1, t2, t3, t4];

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isWaiting]);

  // Keep overlay visible once stage > 0 or in error state
  useEffect(() => {
    if (stage > 0 || connectivityError || isOffline) setHold(true);
    if (!isWaiting && !connectivityError && !isOffline && !isSuccess) setHold(false);
  }, [stage, isWaiting, connectivityError, isOffline, isSuccess]);

  // Smooth, non-deceptive asymptotic progress calculation
  useEffect(() => {
    if (!startTime || !isWaiting || isSuccess || connectivityError || isOffline) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let target = 0;

      if (elapsed < 10000) {
        // 0-10s: smoothly moves through ~5% to ~28%
        target = 5 + (elapsed / 10000) * 23;
      } else if (elapsed < 30000) {
        // 10-30s: smoothly progresses from ~28% to ~62%
        target = 28 + ((elapsed - 10000) / 20000) * 34;
      } else if (elapsed < 60000) {
        // 30-60s: gently progresses from ~62% to ~85%
        target = 62 + ((elapsed - 30000) / 30000) * 23;
      } else {
        // 60s+: asymptotically eases toward ~93% without hitting 100%
        const extraSecs = (elapsed - 60000) / 1000;
        target = 85 + 8 * (1 - Math.exp(-extraSecs / 40));
      }

      setProgressPercent((prev) => Math.max(prev, Math.min(94, Math.round(target))));
    }, 120);

    return () => clearInterval(interval);
  }, [startTime, isWaiting, isSuccess, connectivityError, isOffline]);

  const visible = hold || stage > 0 || connectivityError || isOffline;
  if (!visible) return null;

  const failed = connectivityError || isOffline;

  // Exact milestone messages
  let title = "Nexora is waking up.";
  let description = "Getting your resources ready…";

  if (isSuccess) {
    title = "Nexora is ready ✓";
    description = "Opening your study library…";
  } else if (isOffline) {
    title = "You seem to be offline.";
    description = "Reconnect and we’ll try again.";
  } else if (connectivityError) {
    title = "Couldn’t reach Nexora.";
    description = "Check your connection and try again.";
  } else if (stage === 2) {
    title = "Nexora is getting things ready.";
    description = "Thanks for waiting — your resources will be ready shortly.";
  } else if (stage === 3) {
    title = "Still getting things ready…";
    description = "No need to refresh.";
  } else if (stage >= 4) {
    title = "Taking a little longer than usual.";
    description = "We’ll open Nexora as soon as it’s ready.";
  }

  const retry = () => {
    void queryClient.refetchQueries({
      type: "active",
      predicate: (query) =>
        (query.state.status === "error" && isConnectivityError(query.state.error)) ||
        (query.state.fetchStatus === "fetching" && query.state.data === undefined),
    });
  };

  const handlePenClick = () => {
    setIsPenClicked(true);
    setTimeout(() => setIsPenClicked(false), 450);
  };

  const handleNotebookClick = () => {
    setDoodleIndex((prev) => (prev + 1) % DOODLES.length);
  };

  const handleCatClick = () => {
    setIsCatPetted(true);
    setTimeout(() => setIsCatPetted(false), 600);
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[hsl(var(--background)/.88)] p-3 sm:p-4 backdrop-blur-md transition-opacity duration-200 ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
      data-testid="status-api-wake"
    >
      <style>{`
        @keyframes nexoraProgressBarFlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes nexoraCatTail {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(14deg); }
        }
        @keyframes nexoraCatBreathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.97) translateY(0.6px); }
        }
        @keyframes nexoraSteamRise {
          0% { transform: translateY(0); opacity: 0.7; }
          50% { opacity: 0.35; }
          100% { transform: translateY(-7px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .nexora-animated {
            animation: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-md my-auto rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-5 sm:px-8 sm:py-7 text-center shadow-xl overflow-hidden">
        {/* Subtle decorative top brand badge */}
        <div className="mx-auto mb-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs">
            <Layers3 size={12} strokeWidth={2.4} />
          </div>
          <span className="tracking-wider uppercase text-[10px] font-bold text-[hsl(var(--foreground))]">Nexora</span>
          <span className="text-[hsl(var(--muted-foreground))] text-[10px]">· Study Desk</span>
        </div>

        {/* 
          ==================================================
          NEXORA STUDY DESK ILLUSTRATION (INLINE VECTOR SVG)
          ==================================================
        */}
        <div className="relative mx-auto my-1 select-none" aria-hidden="true">
          <svg
            viewBox="0 0 320 156"
            className="w-full h-auto max-h-36 sm:max-h-40 mx-auto overflow-visible"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <defs>
              {/* Warm conic desk lamp light beam */}
              <linearGradient id="lampGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.28" />
                <stop offset="60%" stopColor="hsl(var(--secondary))" stopOpacity="0.10" />
                <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.00" />
              </linearGradient>

              {/* Cat subtle breathing filter */}
              <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="hsl(var(--foreground))" floodOpacity="0.06" />
              </filter>
            </defs>

            {/* Lamp Light Beam (illuminates desk when lamp is on) */}
            <polygon
              points="68,54 18,142 168,142"
              fill="url(#lampGlow)"
              className={`transition-opacity duration-300 pointer-events-none ${
                lampOn && !failed ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Main Desk Line */}
            <line x1="16" y1="142" x2="304" y2="142" stroke="hsl(var(--border))" strokeWidth="2.2" />
            <line x1="22" y1="146" x2="298" y2="146" stroke="hsl(var(--border)/.6)" strokeWidth="1.2" />

            {/*
              1. STUDY LAMP (Left)
              Interactive: Clicking toggles the warm lamp light
            */}
            <g
              onClick={() => setLampOn((prev) => !prev)}
              className="cursor-pointer group focus-ring outline-none"
              role="button"
              tabIndex={0}
              aria-label="Toggle desk lamp"
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setLampOn((prev) => !prev)}
            >
              <title>Toggle study lamp</title>
              {/* Minimum 44px touch target hitbox */}
              <rect x="25" y="44" width="60" height="102" fill="transparent" stroke="none" />
              {/* Lamp Base */}
              <ellipse cx="48" cy="140" rx="14" ry="3.5" fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth="1.8" />
              <rect x="46" y="132" width="4" height="6" fill="hsl(var(--foreground))" />

              {/* Lamp Gooseneck Arm */}
              <path
                d="M48,132 C48,96 40,70 60,56 C64,53 68,52 70,54"
                stroke="hsl(var(--foreground))"
                strokeWidth="2"
                fill="none"
              />

              {/* Lamp Shade Head */}
              <path
                d="M58,48 L76,64 L65,74 L49,58 Z"
                fill={lampOn && !failed ? "hsl(var(--secondary))" : "hsl(var(--muted))"}
                stroke="hsl(var(--foreground))"
                strokeWidth="1.8"
                className="transition-colors duration-200"
              />
              {/* Bulb rim highlight */}
              <line x1="50" y1="60" x2="63" y2="72" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
            </g>

            {/*
              2. COFFEE/TEA MUG (Beside lamp)
              Features rising steam curls
            */}
            <g transform="translate(86, 120)">
              {/* Steam waves with gentle vertical floating fade */}
              {!failed && (
                <g
                  className="nexora-animated opacity-70"
                  style={{ animation: "nexoraSteamRise 2.8s ease-out infinite" }}
                >
                  <path
                    d="M6,-3 Q9,-7 6,-11 Q3,-15 6,-18"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="1.2"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12,-1 Q15,-5 12,-9 Q9,-13 12,-16"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="1.2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Mug Body */}
              <rect
                x="0"
                y="0"
                width="17"
                height="21"
                rx="4"
                fill="hsl(var(--card))"
                stroke="hsl(var(--foreground))"
                strokeWidth="1.8"
              />
              {/* Mug Inner liquid line */}
              <line x1="3" y1="4" x2="14" y2="4" stroke="hsl(var(--muted-foreground)/.5)" strokeWidth="1" />
              {/* Mug Handle */}
              <path
                d="M17,5 C22,5 22,15 17,16"
                stroke="hsl(var(--foreground))"
                strokeWidth="1.6"
                fill="none"
              />
            </g>

            {/*
              3. NOTEBOOK (Center)
              Interactive: Clicking flips page and changes the doodle
            */}
            <g
              transform="translate(122, 106)"
              onClick={handleNotebookClick}
              className="cursor-pointer focus-ring outline-none"
              role="button"
              tabIndex={0}
              aria-label="Flip notebook page"
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNotebookClick()}
            >
              <title>Flip page / reveal doodle</title>
              {/* Minimum 44px touch target hitbox */}
              <rect x="-4" y="-2" width="76" height="40" fill="transparent" stroke="none" />
              {/* Back Page Shadow/Thickness */}
              <polygon
                points="0,6 66,6 69,35 1,35"
                fill="hsl(var(--muted))"
                stroke="hsl(var(--border))"
                strokeWidth="1.4"
              />
              {/* Open Notebook Spread */}
              <polygon
                points="2,4 68,4 66,33 0,33"
                fill="hsl(var(--card))"
                stroke="hsl(var(--foreground))"
                strokeWidth="1.8"
              />
              {/* Center Spine Crease */}
              <line x1="34" y1="4" x2="33" y2="33" stroke="hsl(var(--border))" strokeWidth="1.5" />

              {/* Ruled lines on left page */}
              <line x1="6" y1="10" x2="28" y2="10" stroke="hsl(var(--muted-foreground)/.35)" strokeWidth="1" />
              <line x1="6" y1="16" x2="28" y2="16" stroke="hsl(var(--muted-foreground)/.35)" strokeWidth="1" />
              <line x1="6" y1="22" x2="24" y2="22" stroke="hsl(var(--muted-foreground)/.35)" strokeWidth="1" />
              <line x1="6" y1="28" x2="26" y2="28" stroke="hsl(var(--muted-foreground)/.35)" strokeWidth="1" />

              {/* Ruled lines on right page */}
              <line x1="40" y1="10" x2="62" y2="10" stroke="hsl(var(--muted-foreground)/.35)" strokeWidth="1" />
              <line x1="40" y1="16" x2="62" y2="16" stroke="hsl(var(--muted-foreground)/.35)" strokeWidth="1" />
              <line x1="40" y1="22" x2="62" y2="22" stroke="hsl(var(--muted-foreground)/.35)" strokeWidth="1" />

              {/* Current Hand-drawn Doodle on Right Page */}
              <g transform="translate(-135, -106)">
                {DOODLES[doodleIndex]}
              </g>
            </g>

            {/*
              4. PEN (Beside notebook)
              Interactive: Clicking causes a quick click/press animation
            */}
            <g
              transform={`translate(204, 114) ${isPenClicked ? "scale(0.96) translate(1, 2)" : ""}`}
              onClick={handlePenClick}
              className="cursor-pointer transition-transform duration-150 focus-ring outline-none"
              role="button"
              tabIndex={0}
              aria-label="Click pen"
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handlePenClick()}
            >
              <title>Click pen</title>
              {/* Minimum 44px touch target hitbox */}
              <rect x="-8" y="-6" width="30" height="42" fill="transparent" stroke="none" />
              {/* Pen Body at an angle */}
              <line
                x1="2"
                y1="1"
                x2="10"
                y2="27"
                stroke="hsl(var(--foreground))"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              {/* Pen Tip Accent */}
              <line
                x1="9"
                y1="24"
                x2="10"
                y2="27"
                stroke="hsl(var(--secondary))"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Pen Pocket Clip */}
              <path
                d="M3,3 L1,8 L4,9"
                stroke="hsl(var(--foreground))"
                strokeWidth="1.2"
                fill="none"
              />
            </g>

            {/*
              5. STUDY COMPANION CAT (Right)
              Clean line-art cat resting quietly beside the notes
              Subtle breathing, tail swish, blinking, and click reaction
            */}
            <g
              transform="translate(228, 102)"
              onClick={handleCatClick}
              className="cursor-pointer focus-ring outline-none"
              role="button"
              tabIndex={0}
              aria-label="Pet study companion cat"
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCatClick()}
            >
              <title>Pet study companion cat</title>
              {/* Minimum 44px touch target hitbox */}
              <rect x="0" y="6" width="68" height="38" fill="transparent" stroke="none" />
              {/* Cat Tail (gently sways at the tip) */}
              <path
                d="M52,32 C58,32 64,28 65,22 C66,16 62,15 63,12"
                stroke="hsl(var(--foreground))"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                className={!failed ? "nexora-animated" : ""}
                style={{
                  transformOrigin: "52px 32px",
                  animation: !failed ? "nexoraCatTail 3.6s ease-in-out infinite" : "none",
                }}
              />

              {/* Cat Loaf Body (subtle breathing rise & fall) */}
              <g
                className={!failed ? "nexora-animated" : ""}
                style={{
                  transformOrigin: "34px 38px",
                  animation: !failed ? "nexoraCatBreathe 4s ease-in-out infinite" : "none",
                }}
              >
                <path
                  d="M12,38 C10,24 22,17 38,17 C52,17 56,26 56,38 Z"
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                  filter="url(#softShadow)"
                />

                {/* Cat Head */}
                <circle
                  cx="16"
                  cy="24"
                  r="11"
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                />

                {/* Cat Ears */}
                <polygon
                  points="9,17 7,7 15,13"
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="1.8"
                />
                <polygon
                  points="17,13 23,7 23,17"
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="1.8"
                />

                {/* Cat Face Features */}
                {isCatPetted ? (
                  // Happy Eyes ( ^ . ^ ) when clicked/petted
                  <g className="stroke-[hsl(var(--secondary))] stroke-[1.6]">
                    <path d="M10,22 Q12,19 14,22" />
                    <path d="M17,22 Q19,19 21,22" />
                  </g>
                ) : (
                  // Calm sleeping/blinking eyes ( - . - )
                  <g className="stroke-[hsl(var(--foreground))] stroke-[1.4]">
                    <path d="M10,23 Q12,25 14,23" />
                    <path d="M17,23 Q19,25 21,23" />
                  </g>
                )}

                {/* Tiny Cat Nose */}
                <polygon
                  points="15.5,25.5 14.5,27 16.5,27"
                  fill="hsl(var(--secondary))"
                  stroke="none"
                />

                {/* Whiskers */}
                <line x1="7" y1="24" x2="2" y2="23" stroke="hsl(var(--muted-foreground)/.6)" strokeWidth="1" />
                <line x1="7" y1="26" x2="2" y2="27" stroke="hsl(var(--muted-foreground)/.6)" strokeWidth="1" />
                <line x1="23" y1="24" x2="28" y2="23" stroke="hsl(var(--muted-foreground)/.6)" strokeWidth="1" />
                <line x1="23" y1="26" x2="28" y2="27" stroke="hsl(var(--muted-foreground)/.6)" strokeWidth="1" />

                {/* Tiny Purr Heart (pops up briefly on click) */}
                {isCatPetted && (
                  <path
                    d="M16,7 C14,3 10,4 12,9 L16,13 L20,9 C22,4 18,3 16,7 Z"
                    fill="hsl(var(--secondary))"
                    stroke="none"
                    className="motion-safe:animate-bounce"
                  />
                )}
              </g>
            </g>
          </svg>
        </div>

        {/* 
          ==================================================
          SMOOTH ASYMPTOTIC PROGRESS BAR (NO FAKE NUMBERS)
          ==================================================
        */}
        {!failed && (
          <div className="mx-auto mt-4 w-full max-w-xs">
            <div
              className="relative h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))] border border-[hsl(var(--border)/.6)] shadow-inner"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-label="Nexora wake-up progress"
            >
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-[hsl(var(--secondary))] to-[hsl(var(--secondary)/.85)] transition-all duration-300 ease-out overflow-hidden"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Continuous liquid light sweep showing active life (prevents feeling stuck at >60s) */}
                {!isSuccess && (
                  <div
                    className="absolute inset-y-0 w-2/5 bg-gradient-to-r from-transparent via-white/40 to-transparent nexora-animated pointer-events-none"
                    style={{
                      animation: "nexoraProgressBarFlow 2.4s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
              <span>Warming up library</span>
              <span className="font-semibold text-[hsl(var(--foreground))]">
                {isSuccess ? "Ready" : stage >= 3 ? "Connecting…" : "In progress"}
              </span>
            </div>
          </div>
        )}

        {/* 
          ==================================================
          CLEAR, HONEST MILESTONE HEADERS & DESCRIPTIONS
          ==================================================
        */}
        <div key={failed ? (isOffline ? "offline" : "error") : isSuccess ? "ready" : `stage-${stage}`} className="mt-4">
          <h1 className="display-font flex items-center justify-center gap-2 text-lg font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-xl">
            {isSuccess && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
            {failed && isOffline && <WifiOff size={18} className="text-amber-500 shrink-0" />}
            {failed && !isOffline && <Layers3 size={18} className="text-[hsl(var(--destructive))] shrink-0" />}
            <span>{title}</span>
          </h1>

          <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--muted-foreground))] sm:text-sm">
            {description}
          </p>
        </div>

        {/* 
          ==================================================
          RETRY ACTIONS (ONLY FOR GENUINE FAILURES/OFFLINE)
          ==================================================
        */}
        {failed && (
          <div className="mt-5">
            <button
              type="button"
              onClick={retry}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-2.5 min-h-[44px] w-full sm:w-auto text-xs sm:text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity shadow-sm"
              data-testid="button-api-wake-retry"
            >
              <RotateCcw size={13} />
              Retry Connection
            </button>
          </div>
        )}

        {/* Subtle, cozy study desk interactive hint */}
        {!failed && !isSuccess && (
          <p className="mt-4 text-[10px] text-[hsl(var(--muted-foreground)/.7)]">
            Tap the lamp, notes, or companion cat while you wait
          </p>
        )}
      </div>
    </div>
  );
}
