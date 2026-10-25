import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSenseAdProps {
  slot?: string;
  format?: string;
  responsive?: boolean;
  className?: string;
}

let scriptInjected = false;
function ensureAdSenseScript() {
  if (typeof window === "undefined" || scriptInjected) return;
  if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
    scriptInjected = true;
    return;
  }
  scriptInjected = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2516613029504029";
  script.crossOrigin = "anonymous";
  script.dataset.adClient = "ca-pub-2516613029504029";
  document.head.appendChild(script);
}

export function AdSenseAd({
  slot = "9231147782",
  format = "auto",
  responsive = true,
  className = "my-6 mx-auto w-full max-w-5xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] p-1.5 sm:p-3 text-center",
}: AdSenseAdProps) {
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    const initAd = () => {
      ensureAdSenseScript();
      if (insRef.current && !insRef.current.getAttribute("data-adsbygoogle-status")) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.debug("AdSense init error:", err);
          }
        }
      }
    };

    const win = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === "function") {
      const idleId = win.requestIdleCallback(initAd, { timeout: 2000 });
      return () => {
        win.cancelIdleCallback?.(idleId);
      };
    } else {
      const timerId = setTimeout(initAd, 1000);
      return () => {
        clearTimeout(timerId);
      };
    }
  }, []);

  return (
    <div className={className} aria-label="Advertisement">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground)/.7)]">
        Advertisement
      </div>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-2516613029504029"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
