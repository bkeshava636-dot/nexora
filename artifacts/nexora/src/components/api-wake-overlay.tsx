import { useEffect, useState } from "react";
import { useIsFetching, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Layers3, Loader2 } from "lucide-react";

const SLOW_MS = 2500;
const LONGER_MS = 12000;

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

export function ApiWakeOverlay() {
  const queryClient = useQueryClient();
  const fetching = useIsFetching({
    predicate: (query) => query.state.data === undefined && query.state.fetchStatus === "fetching",
  });
  const isWaiting = fetching > 0;
  const connectivityError = !isWaiting && hasActiveConnectivityError(queryClient);

  const [slow, setSlow] = useState(false);
  const [longer, setLonger] = useState(false);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (!isWaiting) {
      setSlow(false);
      setLonger(false);
      return;
    }
    const t1 = window.setTimeout(() => setSlow(true), SLOW_MS);
    const t2 = window.setTimeout(() => setLonger(true), LONGER_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isWaiting]);

  useEffect(() => {
    if (slow || connectivityError) setHold(true);
    if (!isWaiting && !connectivityError) setHold(false);
  }, [slow, isWaiting, connectivityError]);

  const visible = hold || slow || connectivityError;
  if (!visible) return null;

  const failed = connectivityError;
  const title = failed
    ? "Unable to connect to the server."
    : longer
      ? "Taking a little longer than usual..."
      : "Nexora is waking up...";
  const body = failed ? null : longer ? null : "This may take a few moments.";

  const retry = () => {
    void queryClient.refetchQueries({
      type: "active",
      predicate: (query) => query.state.status === "error" && isConnectivityError(query.state.error),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[hsl(var(--background)/.92)] px-4 py-8 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      data-testid="status-api-wake"
    >
      <div className="w-full max-w-sm rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-10 text-center sm:px-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
          {failed ? <Layers3 size={22} strokeWidth={2.4} /> : <Loader2 size={22} className="animate-spin" />}
        </div>
        <h1 className="display-font mt-5 text-2xl font-bold tracking-[-.04em] text-[hsl(var(--foreground))]">{title}</h1>
        {body && <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{body}</p>}
        {failed && (
          <button
            type="button"
            onClick={retry}
            className="focus-ring mt-6 inline-flex items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90"
            data-testid="button-api-wake-retry"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
