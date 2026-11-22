import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * AdminAdGuard ensures that NO ads (Monetag popunders, vignettes, in-page push,
 * or AdSense) execute or display while browsing the admin panel or login pages.
 */
export function AdminAdGuard() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith("/admin") || location.startsWith("/login");

  useEffect(() => {
    if (!isAdminRoute) {
      document.body.removeAttribute("data-admin-view");
      return;
    }

    document.body.setAttribute("data-admin-view", "true");

    // Purge any existing ad scripts, iframes, and overlay containers from the DOM
    const purgeAdElements = () => {
      const selectors = [
        'script[src*="5gvci.com"]',
        'script[src*="nap5k.com"]',
        'script[src*="n6wxm.com"]',
        'iframe[src*="5gvci.com"]',
        'iframe[src*="nap5k.com"]',
        'iframe[src*="n6wxm.com"]',
        'div[id*="monetag"]',
        'div[class*="monetag"]',
        'div[id*="vignette"]',
        'div[class*="vignette"]',
        'div[style*="z-index: 2147483647"]',
        'div[style*="z-index:2147483647"]',
        'div[style*="z-index: 999999"]',
        'div[style*="z-index:999999"]',
      ];
      try {
        const found = document.querySelectorAll(selectors.join(","));
        found.forEach((el) => {
          try {
            el.remove();
          } catch {}
        });
      } catch {}
    };

    purgeAdElements();

    // Guard against third-party ad scripts attempting to inject overlays or iframes while on admin
    const observer = new MutationObserver(() => {
      purgeAdElements();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Guard window.open against popunder/ad triggers while inside the admin workspace
    const originalWindowOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
      const urlStr = typeof url === "string" ? url : url ? url.toString() : "";
      if (
        urlStr &&
        (urlStr.includes("5gvci") ||
          urlStr.includes("nap5k") ||
          urlStr.includes("n6wxm") ||
          urlStr.includes("monetag") ||
          urlStr.includes("vignette"))
      ) {
        console.debug("[AdminAdGuard] Blocked ad popunder in admin panel:", urlStr);
        return null;
      }
      return originalWindowOpen.call(window, url, target, features);
    };

    return () => {
      document.body.removeAttribute("data-admin-view");
      observer.disconnect();
      window.open = originalWindowOpen;
    };
  }, [isAdminRoute]);

  return null;
}
