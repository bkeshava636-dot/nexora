import { type FormEvent, useState, useEffect } from "react";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  CircleAlert,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useCreateFeedback, type FeedbackCategory } from "@workspace/api-client-react";

export interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: FeedbackCategory;
}

interface CategoryOption {
  id: FeedbackCategory;
  label: string;
  shortLabel: string;
  icon: typeof Lightbulb;
  description: string;
  placeholder: string;
  badgeClass: string;
  activeBorderClass: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: "improvement",
    label: "Suggestion / Feature Idea",
    shortLabel: "Suggestion",
    icon: Lightbulb,
    description: "Suggest new features, UI tweaks, or improvements for Nexora.",
    placeholder: "What would make Nexora more useful for you? Describe your idea or suggestion...",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    activeBorderClass: "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    id: "bug",
    label: "Bug / Error Report",
    shortLabel: "Bug / Glitch",
    icon: Bug,
    description: "Report a broken link, UI glitch, calculation error, or crash.",
    placeholder: "What went wrong? Please describe what happened and what page you were on...",
    badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    activeBorderClass: "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    id: "content",
    label: "Missing / Wrong Content",
    shortLabel: "Missing Content",
    icon: HelpCircle,
    description: "Let us know about missing notes, old syllabus, or incorrect PYQs.",
    placeholder: "Which branch, semester, or subject is missing resources or needs an update?...",
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    activeBorderClass: "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    id: "other",
    label: "General Feedback",
    shortLabel: "General",
    icon: MessageSquare,
    description: "Share your thoughts, general impressions, or compliments.",
    placeholder: "Tell us what's on your mind or how your experience with Nexora has been...",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    activeBorderClass: "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
];

export function FeedbackDialog({
  open,
  onOpenChange,
  initialCategory = "improvement",
}: FeedbackDialogProps) {
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const createFeedback = useCreateFeedback();

  useEffect(() => {
    if (open) {
      if (initialCategory) {
        setCategory(initialCategory);
      }
      setIsSuccess(false);
      setError(null);
    }
  }, [open, initialCategory]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setMessage("");
      setName("");
      setEmail("");
      setError(null);
      setIsSuccess(false);
    }, 250);
  };

  const selectedCategoryMeta = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedMsg = message.trim();
    if (trimmedMsg.length < 3) {
      setError("Please provide a little more detail (at least 3 characters).");
      return;
    }

    const currentUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";

    createFeedback.mutate(
      {
        data: {
          category,
          message: trimmedMsg,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          pageUrl: currentUrl || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
          toast({
            title: "Feedback received! 🚀",
            description: "Thank you for helping us make Nexora better for everyone.",
          });
        },
        onError: (err: unknown) => {
          const msg =
            (err as { message?: string; error?: string })?.message ||
            "Unable to submit feedback. Please check your connection and try again.";
          setError(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-7 max-h-[92vh] overflow-y-auto"
        data-testid="dialog-feedback"
      >
        {isSuccess ? (
          <div className="text-center py-6 fade-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-sm">
              <CheckCircle2 size={34} />
            </div>
            <h2 className="display-font mt-5 text-2xl sm:text-3xl font-bold tracking-[-.03em] text-[hsl(var(--foreground))]">
              Thank you for your feedback! 🚀
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
              Your feedback directly shapes Nexora. We review all submissions to fix bugs and build requested features.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleClose}
                className="focus-ring inline-flex h-11 items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--primary)/.9)] cursor-pointer"
                data-testid="button-feedback-success-close"
              >
                Back to Nexora
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setIsSuccess(false);
                }}
                className="focus-ring inline-flex h-11 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer"
              >
                Send Another Note
              </button>
            </div>
          </div>
        ) : (
          <div>
            <DialogHeader className="text-left space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--secondary)/.2)] text-[hsl(var(--secondary-foreground))]">
                  <Sparkles size={14} />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--secondary-foreground))]">
                  Nexora Feedback
                </span>
              </div>
              <DialogTitle className="display-font text-2xl font-bold tracking-[-.03em] text-[hsl(var(--foreground))]">
                Give Feedback or Report a Bug
              </DialogTitle>
              <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                Help us make Nexora the best study companion for BITM.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Category Picker */}
              <div>
                <label className="mb-2 block text-xs font-bold text-[hsl(var(--foreground))]">
                  What kind of feedback do you have?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategory(cat.id);
                          setError(null);
                        }}
                        className={`focus-ring flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? `${cat.activeBorderClass} shadow-xs font-bold`
                            : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)] hover:text-[hsl(var(--foreground))]"
                        }`}
                        data-testid={`button-feedback-cat-${cat.id}`}
                      >
                        <Icon size={16} className={`shrink-0 mt-0.5 ${isSelected ? "" : "text-[hsl(var(--muted-foreground))]"}`} />
                        <div>
                          <div className="text-xs leading-snug">{cat.shortLabel}</div>
                          <div className="text-[10px] text-[hsl(var(--muted-foreground))] line-clamp-1 font-normal">
                            {cat.id === "bug" ? "Errors & glitches" : cat.id === "improvement" ? "Feature requests" : cat.id === "content" ? "Missing notes" : "Thoughts"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="feedback-message" className="block text-xs font-bold text-[hsl(var(--foreground))]">
                    Your Message <span className="text-[hsl(var(--destructive))]">*</span>
                  </label>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {message.length} / 2000
                  </span>
                </div>
                <textarea
                  id="feedback-message"
                  required
                  rows={4}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={selectedCategoryMeta.placeholder}
                  className="input-style w-full rounded-xl text-xs sm:text-sm font-normal py-2.5 px-3 resize-y min-h-[90px]"
                  data-testid="textarea-feedback-message"
                />
              </div>

              {/* Optional Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="feedback-name" className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">
                    Your Name <span className="text-[10px] font-normal text-[hsl(var(--muted-foreground))]">(optional)</span>
                  </label>
                  <input
                    id="feedback-name"
                    type="text"
                    placeholder="e.g. Aditi / Rohan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-style h-9 text-xs"
                    data-testid="input-feedback-name"
                  />
                </div>
                <div>
                  <label htmlFor="feedback-email" className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">
                    Your Email <span className="text-[10px] font-normal text-[hsl(var(--muted-foreground))]">(optional)</span>
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    placeholder="e.g. you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-style h-9 text-xs"
                    data-testid="input-feedback-email"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                💡 Entering your email is optional, but helps us notify you when your suggestion is implemented or bug is resolved.
              </p>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-medium text-[hsl(var(--destructive))]">
                  <CircleAlert size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="focus-ring inline-flex h-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFeedback.isPending || !message.trim()}
                  className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-all hover:bg-[hsl(var(--primary)/.9)] disabled:opacity-50 cursor-pointer"
                  data-testid="button-submit-feedback"
                >
                  {createFeedback.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
