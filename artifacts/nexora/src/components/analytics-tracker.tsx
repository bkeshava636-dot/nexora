import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useRecordVisit } from "@workspace/api-client-react";

function getOrSetVisitorId(): string {
  try {
    let vid = localStorage.getItem("nexora_vid");
    if (!vid) {
      vid = `v_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      localStorage.setItem("nexora_vid", vid);
    }
    return vid;
  } catch {
    return `anon_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function getOrSetSessionId(): string {
  try {
    let sid = sessionStorage.getItem("nexora_sid");
    if (!sid) {
      sid = `s_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      sessionStorage.setItem("nexora_sid", sid);
    }
    return sid;
  } catch {
    return `sess_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function getDeviceType(): "mobile" | "desktop" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua) || (width >= 640 && width <= 1024 && "ontouchstart" in window)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|android.*mobile|blackberry|phone|iemobile|opera mini/.test(ua) || width < 640) {
    return "mobile";
  }
  return "desktop";
}

export function AnalyticsTracker() {
  const [location] = useLocation();
  const recordVisit = useRecordVisit();
  const lastRecordedPath = useRef<string | null>(null);
  const lastRecordTime = useRef<number>(0);

  useEffect(() => {
    // Avoid tracking admin editing actions to keep student visitor metrics authentic
    if (location.startsWith("/admin") || location.startsWith("/login")) {
      return;
    }

    const now = Date.now();
    // Debounce duplicate pings within 2 seconds on same path
    if (lastRecordedPath.current === location && now - lastRecordTime.current < 2000) {
      return;
    }

    lastRecordedPath.current = location;
    lastRecordTime.current = now;

    try {
      const visitorId = getOrSetVisitorId();
      const sessionId = getOrSetSessionId();
      const deviceType = getDeviceType();
      const referrer = document.referrer ? new URL(document.referrer, window.location.origin).hostname : "direct";

      recordVisit.mutate({
        visitorId,
        sessionId,
        path: location,
        deviceType,
        referrer,
      });

      // Maintain backwards-compatibility flag for legacy footer counter
      sessionStorage.setItem("nexora_visit_recorded", "1");
    } catch {
      // Non-fatal if tracking is blocked by browser privacy settings
    }
  }, [location, recordVisit]);

  return null;
}
