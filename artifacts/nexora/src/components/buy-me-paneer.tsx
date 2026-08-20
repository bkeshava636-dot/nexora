import { useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Heart, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreatePaymentOrder, useVerifyPayment } from "@workspace/api-client-react";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
  theme?: {
    color?: string;
  };
  prefill?: {
    name?: string;
    email?: string;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
      close?: () => void;
    };
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (window.Razorpay) {
    return Promise.resolve(true);
  }
  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

const PRESET_AMOUNTS = [50, 100, 200];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

export function BuyMePaneerFooter() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <footer className="mt-14 border-t border-[hsl(var(--border)/.6)] py-8 text-center sm:py-10" data-testid="footer-buy-me-paneer">
        <div className="mx-auto max-w-md px-4">
          <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))] sm:text-sm">
            Found Nexora useful?
            <br className="sm:hidden" /> You can buy me some paneer as a little thank you. ❤️
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-xs font-bold text-[hsl(var(--foreground))] shadow-xs transition-all hover:border-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--secondary-foreground))] cursor-pointer active:scale-95"
              data-testid="button-buy-me-paneer-trigger"
            >
              <span role="img" aria-label="cheese">🧀</span> Buy Me Paneer
            </button>
          </div>
        </div>
      </footer>

      <BuyMePaneerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function BuyMePaneerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [step, setStep] = useState<"select" | "processing" | "verifying" | "success" | "failed" | "cancelled">("select");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProcessingRef = useRef(false);
  const createOrder = useCreatePaymentOrder();
  const verifyPayment = useVerifyPayment();

  const handleClose = () => {
    if (isProcessingRef.current) return;
    onOpenChange(false);
    setTimeout(() => {
      setStep("select");
      setErrorMessage(null);
      setSelectedPreset(100);
      setCustomAmount("");
      setIsCustom(false);
    }, 200);
  };

  const getEffectiveAmount = (): number | null => {
    if (isCustom) {
      const parsed = parseInt(customAmount.trim(), 10);
      if (isNaN(parsed) || parsed < MIN_AMOUNT || parsed > MAX_AMOUNT) {
        return null;
      }
      return parsed;
    }
    return selectedPreset;
  };

  const handleSelectPreset = (amount: number) => {
    setIsCustom(false);
    setSelectedPreset(amount);
    setErrorMessage(null);
  };

  const handleCustomChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    setCustomAmount(clean);
    setIsCustom(true);
    setSelectedPreset(null);
    setErrorMessage(null);
  };

  const handleProceed = async () => {
    if (isProcessingRef.current) return;
    setErrorMessage(null);
    const amount = getEffectiveAmount();

    if (!amount) {
      if (isCustom) {
        setErrorMessage(`Please enter a valid amount between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT.toLocaleString("en-IN")}.`);
      } else {
        setErrorMessage("Please select or enter an amount.");
      }
      return;
    }

    isProcessingRef.current = true;
    setStep("processing");

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        isProcessingRef.current = false;
        setStep("failed");
        setErrorMessage("Failed to load Razorpay Checkout. Please check your network connection.");
        return;
      }

      const orderData = await createOrder.mutateAsync({
        data: { amount },
      });

      // Close the Nexora Radix dialog so its focus-trap and pointer-event blocking
      // do not interfere with the Razorpay iframe/modal
      onOpenChange(false);

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Nexora",
        description: "Buy Me Paneer support",
        order_id: orderData.orderId,
        modal: {
          ondismiss: () => {
            isProcessingRef.current = false;
            setStep("cancelled");
            onOpenChange(true);
          },
        },
        theme: {
          color: "#e5a93c",
        },
        handler: async (response: RazorpayResponse) => {
          isProcessingRef.current = false;
          setStep("verifying");
          onOpenChange(true);

          try {
            const verificationResult = await verifyPayment.mutateAsync({
              data: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verificationResult.success) {
              setStep("success");
            } else {
              setStep("failed");
              setErrorMessage(verificationResult.message || "Payment verification failed.");
            }
          } catch (err: unknown) {
            setStep("failed");
            const msg = err instanceof Error ? err.message : "Payment verification failed.";
            setErrorMessage(msg);
          }
        },
      });

      rzp.on("payment.failed", () => {
        isProcessingRef.current = false;
        setStep("failed");
        setErrorMessage("Payment couldn't be completed.");
        onOpenChange(true);
      });

      rzp.open();
    } catch (err: unknown) {
      isProcessingRef.current = false;
      setStep("select");
      const errObj = err as { message?: string; error?: string };
      if (errObj?.error === "payment_not_configured" || errObj?.message?.includes("not configured")) {
        setErrorMessage("Razorpay payments are currently being set up. Please try again later!");
      } else {
        setErrorMessage(errObj?.message || "Could not initiate payment. Please try again.");
      }
    }
  };

  const effectiveAmount = getEffectiveAmount();
  const isBusy = step === "processing" || step === "verifying";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8" data-testid="dialog-buy-me-paneer">
        {step === "verifying" ? (
          <div className="text-center py-6 fade-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-sm">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h2 className="display-font mt-5 text-2xl font-bold tracking-[-.03em] text-[hsl(var(--foreground))]">
              Verifying payment…
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Confirming transaction with the server. Please do not refresh.
            </p>
          </div>
        ) : step === "success" ? (
          <div className="text-center py-4 fade-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-sm">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="display-font mt-5 text-2xl font-bold tracking-[-.03em] text-[hsl(var(--foreground))]">
              Thanks for the paneer! 🧀❤️
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Really appreciate the support.
            </p>
            <div className="mt-7">
              <button
                type="button"
                onClick={handleClose}
                className="focus-ring w-full inline-flex h-11 items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--primary)/.9)] cursor-pointer"
                data-testid="button-paneer-back"
              >
                Back to Nexora
              </button>
            </div>
          </div>
        ) : step === "failed" ? (
          <div className="text-center py-4 fade-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))] shadow-sm">
              <CircleAlert size={32} />
            </div>
            <h2 className="display-font mt-5 text-2xl font-bold tracking-[-.03em] text-[hsl(var(--foreground))]">
              Payment couldn't be completed.
            </h2>
            {errorMessage && (
              <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                {errorMessage}
              </p>
            )}
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep("select");
                  setErrorMessage(null);
                }}
                className="focus-ring flex-1 inline-flex h-11 items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--primary)/.9)] cursor-pointer"
                data-testid="button-paneer-try-again"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="focus-ring inline-flex h-11 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : step === "cancelled" ? (
          <div className="text-center py-4 fade-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] shadow-sm">
              <X size={32} />
            </div>
            <h2 className="display-font mt-5 text-2xl font-bold tracking-[-.03em] text-[hsl(var(--foreground))]">
              Payment cancelled.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              No amount was deducted. You can try again whenever you like.
            </p>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep("select");
                  setErrorMessage(null);
                }}
                className="focus-ring flex-1 inline-flex h-11 items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--primary)/.9)] cursor-pointer"
                data-testid="button-paneer-try-again-cancelled"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="focus-ring inline-flex h-11 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-sm text-2xl">
                🧀
              </div>
              <DialogTitle className="display-font text-2xl font-bold tracking-[-.03em] text-[hsl(var(--foreground))]">
                Buy Me Paneer
              </DialogTitle>
              <DialogDescription className="text-sm text-[hsl(var(--muted-foreground))]">
                An optional tip to show appreciation for Nexora. Nexora will always be free to use!
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
                  Select Amount (INR)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {PRESET_AMOUNTS.map((amt) => {
                    const active = !isCustom && selectedPreset === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSelectPreset(amt)}
                        disabled={isBusy}
                        className={`focus-ring flex h-12 flex-col items-center justify-center rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          active
                            ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-xs"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                        }`}
                        data-testid={`button-preset-${amt}`}
                      >
                        ₹{amt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="custom-amount-input" className="mb-1.5 block text-xs font-bold text-[hsl(var(--foreground))]">
                  Or enter custom amount
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[hsl(var(--muted-foreground))]">
                    ₹
                  </span>
                  <input
                    id="custom-amount-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 150"
                    value={customAmount}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    disabled={isBusy}
                    className={`focus-ring w-full rounded-xl border py-2.5 pl-8 pr-3 text-sm font-semibold transition-all ${
                      isCustom
                        ? "border-[hsl(var(--secondary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
                        : "border-[hsl(var(--input))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
                    }`}
                    data-testid="input-custom-amount"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-medium text-[hsl(var(--destructive))]">
                  <CircleAlert size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProceed}
                  disabled={isBusy || !effectiveAmount}
                  className="focus-ring flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-all hover:bg-[hsl(var(--primary)/.9)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  data-testid="button-paneer-proceed"
                >
                  {isBusy ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Connecting to Razorpay…</span>
                    </>
                  ) : (
                    <>
                      <Heart size={16} className="text-[hsl(var(--secondary))]" />
                      <span>Proceed to Pay {effectiveAmount ? `₹${effectiveAmount}` : ""}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] text-[hsl(var(--muted-foreground))]">
                Secured by Razorpay • 100% optional support
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
