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

export function AdSenseAd({
  slot = "9231147782",
  format = "auto",
  responsive = true,
  className = "my-8 mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] p-3 text-center",
}: AdSenseAdProps) {
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    // Only request ad if the ins element is available and hasn't already been processed
    if (insRef.current && !insRef.current.getAttribute("data-adsbygoogle-status")) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.debug("AdSense init error:", err);
        }
      }
    }
  }, []);

  return (
    <div className={className} aria-label="Advertisement">
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground)/.7)]">
        Advertisement
      </div>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: "90px" }}
        data-ad-client="ca-pub-2516613029504029"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
