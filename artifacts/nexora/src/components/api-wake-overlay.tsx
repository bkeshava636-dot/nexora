import { useEffect, useState } from "react";
import { useIsFetching, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Layers3 } from "lucide-react";

const STAGE_1_MS = 2500;
const STAGE_2_MS = 9000;
const STAGE_3_MS = 15000;

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

  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (!isWaiting) {
      setStage(0);
      return;
    }

    const t1 = window.setTimeout(() => setStage(1), STAGE_1_MS);
    const t2 = window.setTimeout(() => setStage(2), STAGE_2_MS);
    const t3 = window.setTimeout(() => setStage(3), STAGE_3_MS);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [isWaiting]);

  useEffect(() => {
    if (stage > 0 || connectivityError) setHold(true);
    if (!isWaiting && !connectivityError) setHold(false);
  }, [stage, isWaiting, connectivityError]);

  const visible = hold || stage > 0 || connectivityError;
  if (!visible) return null;

  const failed = connectivityError;

  let title = "Nexora is waking up...";
  let description: string | null = "Just a moment while we connect to the resource library.";

  if (failed) {
    title = "Unable to connect to the server.";
    description = null;
  } else if (stage === 2) {
    title = "Nexora is taking a little longer...";
    description = "The server is waking up. This usually takes a few seconds.";
  } else if (stage === 3) {
    title = "Still connecting...";
    description = "You can wait a little longer or try again.";
  }

  const retry = () => {
    void queryClient.refetchQueries({
      type: "active",
      predicate: (query) =>
        (query.state.status === "error" && isConnectivityError(query.state.error)) ||
        (query.state.fetchStatus === "fetching" && query.state.data === undefined),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[hsl(var(--background)/.88)] px-4 py-8 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      data-testid="status-api-wake"
    >
      <div className="w-full max-w-sm rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-9 text-center shadow-lg sm:px-8 sm:py-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-sm transition-transform duration-300">
          <Layers3 size={22} strokeWidth={2.4} />
        </div>

        {!failed && (
          <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden="true">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--secondary))] animate-pulse motion-reduce:animate-none" />
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--secondary))] animate-pulse motion-reduce:animate-none [animation-delay:200ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--secondary))] animate-pulse motion-reduce:animate-none [animation-delay:400ms]" />
          </div>
        )}

        <div key={failed ? "error" : `stage-${stage}`} className="fade-up">
          <h1 className="display-font mt-4 text-xl font-bold tracking-[-.03em] text-[hsl(var(--foreground))] sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {description}
            </p>
          )}
        </div>

        {failed && (
          <div className="mt-6">
            <button
              type="button"
              onClick={retry}
              className="focus-ring inline-flex items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
              data-testid="button-api-wake-retry"
            >
              Retry
            </button>
          </div>
        )}

        {!failed && stage === 3 && (
          <div className="mt-6 fade-up">
            <button
              type="button"
              onClick={retry}
              className="focus-ring inline-flex items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] shadow-sm transition-colors"
              data-testid="button-api-wake-retry"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
