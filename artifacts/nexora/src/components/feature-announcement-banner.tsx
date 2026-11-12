import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Sparkles, ShoppingBag, ArrowRight, X } from "lucide-react";
import { useGetFeatureBanner } from "@workspace/api-client-react";

const DISMISSED_KEY = "nexora_feature_banner_dismissed_v1";

export function FeatureAnnouncementBanner() {
  const { data: banner } = useGetFeatureBanner();
  const [isDismissed, setIsDismissed] = useState(true); // default true to avoid flash before checking storage

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      if (stored === "true") {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Ignore localStorage write failures
    }
  };

  // If banner is disabled by admin or dismissed by user, do not render
  if (!banner?.enabled || isDismissed) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="New feature announcement"
      className="relative mb-6 overflow-hidden rounded-2xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5 transition-all animate-in fade-in slide-in-from-top-2 duration-300"
    >
      {/* Decorative accent wash in background */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[hsl(var(--primary)/.08)] blur-2xl" />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1.5 bg-[hsl(var(--primary))]" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5 pl-1.5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))] shadow-xs">
            <ShoppingBag size={18} />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-[hsl(var(--primary)/.15)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[hsl(var(--primary))]">
                <Sparkles size={11} /> {banner.badge || "New Feature"}
              </span>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))] sm:text-base">
                {banner.title || "Check out Campus Trade!"}
              </h2>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              {banner.message ||
                "Buy and sell used textbooks, notes, drafters, calculators, and lab gear directly with fellow students on campus."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:shrink-0 sm:self-center pl-1.5 sm:pl-0">
          <Link
            href={banner.linkUrl || "/marketplace"}
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:bg-[hsl(var(--primary)/.9)] transition-colors cursor-pointer"
          >
            <span>{banner.linkText || "Explore Campus Trade"}</span>
            <ArrowRight size={13} />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss announcement"
            title="Dismiss announcement"
            className="focus-ring rounded-xl p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
