import { useState, useMemo, useRef, type FormEvent, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ShoppingBag,
  Search,
  Plus,
  BookOpen,
  Layers3,
  Cpu,
  FileText,
  Package,
  MapPin,
  MessageCircle,
  CheckCircle,
  Tag,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Loader2,
  X,
  AlertCircle,
  Filter,
  Instagram,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export interface MarketplaceItem {
  id: number;
  title: string;
  description: string;
  category: "Textbooks" | "Notes & Binders" | "Lab Equipment" | "Electronics & Gadgets" | "Other Campus Items";
  price: number;
  condition: "Brand New" | "Like New" | "Good" | "Fair";
  sellerName: string;
  sellerContact: string;
  sellerInstagram?: string | null;
  sellerEmail?: string | null;
  campusLocation: string;
  branch?: string | null;
  semester?: string | null;
  imageUrl?: string | null;
  status: "active" | "sold" | "hidden";
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  "All",
  "Textbooks",
  "Notes & Binders",
  "Lab Equipment",
  "Electronics & Gadgets",
  "Other Campus Items",
] as const;

const CONDITIONS = [
  "All Conditions",
  "Brand New",
  "Like New",
  "Good",
  "Fair",
] as const;

function getCategoryIcon(category: string) {
  switch (category) {
    case "Textbooks":
      return BookOpen;
    case "Notes & Binders":
      return FileText;
    case "Lab Equipment":
      return Layers3;
    case "Electronics & Gadgets":
      return Cpu;
    default:
      return Package;
  }
}

// Client-side image compression to lightweight JPEG/WebP data URL
function compressImage(file: File, maxDim = 900, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(e.target?.result as string);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Unable to parse image file."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export function MarketplacePage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedCondition, setSelectedCondition] = useState<string>("All Conditions");
  const [search, setSearch] = useState<string>("");
  const [showSold, setShowSold] = useState<boolean>(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [soldTargetItem, setSoldTargetItem] = useState<MarketplaceItem | null>(null);

  // Mandatory Terms & Conditions modals for Sellers & Buyers
  const [showSellerTermsModal, setShowSellerTermsModal] = useState<boolean>(false);
  const [sellerAgreed, setSellerAgreed] = useState<boolean>(false);

  const [buyerContactTarget, setBuyerContactTarget] = useState<{
    item: MarketplaceItem;
    channel: "whatsapp" | "instagram" | "phone";
    url: string;
  } | null>(null);
  const [buyerAgreed, setBuyerAgreed] = useState<boolean>(false);

  // Fetch marketplace items
  const { data: items = [], isLoading } = useQuery<MarketplaceItem[]>({
    queryKey: ["marketplace", showSold ? "sold" : "active"],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace?status=${showSold ? "sold" : "active"}`);
      if (!res.ok) {
        throw new Error("Failed to load marketplace items");
      }
      return res.json();
    },
  });

  // Mark as sold mutation
  const markSoldMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/marketplace/${id}/sold`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark item as sold");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Marked as Sold",
        description: "Your listing has been updated to sold status.",
      });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      setSoldTargetItem(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Action Failed",
        description: err.message || "Could not update status.",
        variant: "destructive",
      });
    },
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCategory === "All" || item.category === selectedCategory;
      const matchCondition = selectedCondition === "All Conditions" || item.condition === selectedCondition;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.campusLocation.toLowerCase().includes(q) ||
        (item.branch && item.branch.toLowerCase().includes(q)) ||
        (item.sellerName && item.sellerName.toLowerCase().includes(q)) ||
        (item.sellerInstagram && item.sellerInstagram.toLowerCase().includes(q));
      return matchCat && matchCondition && matchSearch;
    });
  }, [items, selectedCategory, selectedCondition, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length };
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [items]);

  return (
    <div className="hero-wash min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
          <Link href="/" className="hover:text-[hsl(var(--foreground))] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[hsl(var(--foreground))]">Campus Trade</span>
        </nav>

        {/* Hero Section */}
        <section className="soft-grid relative overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-5 py-8 sm:px-10 sm:py-12 fade-up">
          <div className="relative max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-1.5 text-xs font-bold text-[hsl(var(--accent-foreground))] shadow-xs">
              <ShoppingBag size={14} /> Student Classifieds & Peer-to-Peer Bazaar
            </div>
            <h1 className="display-font text-3xl font-bold tracking-[-.05em] sm:text-5xl">
              Campus Trade
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))] sm:text-base">
              Buy, sell, or pass down textbooks, calculators, lab drafters, and study kits peer-to-peer on campus with zero platform fees.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSellerAgreed(false);
                  setShowSellerTermsModal(true);
                }}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
              >
                <Plus size={16} /> Post an Item for Sale
              </button>
              <button
                type="button"
                onClick={() => setShowSold(!showSold)}
                className={`focus-ring inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  showSold
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                {showSold ? "Viewing Sold Items" : "View Sold Archive"}
              </button>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 hidden h-56 w-56 rounded-full border-[18px] border-[hsl(var(--secondary)/.2)] sm:block" />
        </section>

        {/* Search & Filters */}
        <section className="mt-8 space-y-4 fade-up fade-up-delay-1">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search textbooks, calculators, drafters, or seller names..."
                className="input-style h-11 w-full !pl-11 pr-4 text-xs sm:text-sm"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="input-style h-11 w-full px-3 text-xs sm:text-sm cursor-pointer"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              const count = categoryCounts[cat] ?? 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground)/.25)] hover:text-[hsl(var(--foreground))]"
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.2 ${
                    active ? "bg-black/20 text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Listings Grid */}
        <section className="mt-8">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-[hsl(var(--muted-foreground))]">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
              <p className="text-sm">Loading campus listings...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.4)] px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] mb-4">
                <ShoppingBag size={24} />
              </div>
              <h3 className="text-base font-bold text-[hsl(var(--foreground))]">No items found</h3>
              <p className="mt-1.5 max-w-md text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                {search || selectedCategory !== "All" || selectedCondition !== "All Conditions"
                  ? "No listings match your search or filter combination. Try clearing your filters."
                  : "Be the first student to list a textbook or campus essential!"}
              </p>
              <button
                type="button"
                onClick={() => setIsSellModalOpen(true)}
                className="focus-ring mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] cursor-pointer"
              >
                <Plus size={14} /> Post the First Listing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const Icon = getCategoryIcon(item.category);
                const isSold = item.status === "sold";
                const cleanPhone = item.sellerContact.replace(/[^0-9]/g, "");
                const waMessage = encodeURIComponent(
                  `Hi ${item.sellerName}, I saw your listing for "${item.title}" on Nexora Campus Trade. Is it still available?`
                );
                const waUrl = cleanPhone.length >= 10
                  ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${waMessage}`
                  : null;

                const instaHandle = item.sellerInstagram
                  ? item.sellerInstagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "")
                  : null;
                const instaUrl = instaHandle ? `https://instagram.com/${instaHandle}` : null;

                return (
                  <article
                    key={item.id}
                    className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-xs transition-all hover:shadow-md ${
                      isSold ? "opacity-75 border-dashed border-[hsl(var(--border))]" : "border-[hsl(var(--border))]"
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--foreground))]">
                          <Icon size={13} className="text-[hsl(var(--primary))]" /> {item.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isSold ? (
                            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              SOLD
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              {item.condition}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Image Thumbnail (if present) */}
                      {item.imageUrl && (
                        <div className="mb-3.5 h-44 w-full overflow-hidden rounded-xl bg-[hsl(var(--muted)/.5)] border border-[hsl(var(--border)/.6)]">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      {/* Title & Price */}
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-base font-bold tracking-tight text-[hsl(var(--foreground))] line-clamp-1">
                          {item.title}
                        </h3>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                          {item.price === 0 ? "Free" : `₹${item.price}`}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))] line-clamp-3">
                        {item.description}
                      </p>

                      {/* Tags (Branch / Semester) */}
                      {(item.branch || item.semester) && (
                        <div className="mt-3 flex flex-wrap gap-1 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                          {item.branch && <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5">{item.branch}</span>}
                          {item.semester && <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5">{item.semester}</span>}
                        </div>
                      )}
                    </div>

                    {/* Bottom Metadata & Contact Button */}
                    <div className="mt-5 border-t border-[hsl(var(--border)/.6)] pt-3.5">
                      <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))] mb-3">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} className="text-red-500/80" /> {item.campusLocation}
                        </span>
                        <span>by {item.sellerName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSold ? (
                          <div className="w-full text-center py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] rounded-xl">
                            Item no longer available
                          </div>
                        ) : (
                          <>
                            {waUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBuyerAgreed(false);
                                  setBuyerContactTarget({
                                    item,
                                    channel: "whatsapp",
                                    url: waUrl,
                                  });
                                }}
                                className="focus-ring flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                              >
                                <MessageCircle size={14} /> WhatsApp
                              </button>
                            )}

                            {instaUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBuyerAgreed(false);
                                  setBuyerContactTarget({
                                    item,
                                    channel: "instagram",
                                    url: instaUrl,
                                  });
                                }}
                                title={`Instagram: @${instaHandle}`}
                                className={`focus-ring inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 px-3 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer ${
                                  waUrl ? "" : "flex-1"
                                }`}
                              >
                                <Instagram size={14} />
                                <span>Instagram</span>
                              </button>
                            )}

                            {!waUrl && !instaUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBuyerAgreed(false);
                                  setBuyerContactTarget({
                                    item,
                                    channel: "phone",
                                    url: `tel:${item.sellerContact}`,
                                  });
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))] transition-colors cursor-pointer"
                              >
                                <Phone size={13} /> {item.sellerContact}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSoldTargetItem(item)}
                              title="Mark as Sold"
                              className="focus-ring inline-flex items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
                            >
                              <CheckCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Safety & Intermediary Disclaimer Card */}
        <section className="mt-10 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Shield size={16} className="text-amber-500" /> Campus Trade Safety & Intermediary Notice
              </h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Campus Trade is an unofficial student notice board. The developer is an intermediary and is not a party to any transactions. The developer does not process payments, inspect goods, or bear liability for trades. Always meet in daylight in public campus spots and inspect items before payment.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs font-semibold">
              <Link href="/terms" className="text-[hsl(var(--primary))] hover:underline">
                Terms & Fair Use Disclaimer
              </Link>
              <span className="text-[hsl(var(--muted-foreground))]">•</span>
              <Link href="/privacy" className="text-[hsl(var(--primary))] hover:underline">
                Privacy Policy
              </Link>
            </div>
          </div>
        </section>

        {/* Seller Terms & Conditions Agreement Dialog */}
        <Dialog open={showSellerTermsModal} onOpenChange={setShowSellerTermsModal}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">Seller Terms & Listing Guidelines</DialogTitle>
                  <DialogDescription className="text-xs">
                    Please review and accept the campus trading rules before creating a listing.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4 space-y-3.5 text-xs text-[hsl(var(--muted-foreground))]">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
                <strong>Platform Intermediary Notice:</strong> Nexora provides a student notice board only. The developer is not an auctioneer, merchant, or party to any transaction and charges zero commissions.
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-[10px] font-bold text-[hsl(var(--primary))]">1</span>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))]">Lawful Ownership & Truthful Listing</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      You must be the lawful owner of the item. Physical condition, edition, annotations, and price must be stated truthfully.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-red-600">2</span>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))]">Zero Tolerance for Prohibited Items</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      Never list leaked exam papers, test keys, homework impersonation or ghostwriting, stolen property, alcohol, drugs, weapons, or pirated materials. Violations result in immediate removal.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-[10px] font-bold text-[hsl(var(--primary))]">3</span>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))]">Public Contact Visibility</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      Your name, WhatsApp phone number, optional Instagram handle, campus meetup spot, and item photos will be openly viewable by other students.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-[10px] font-bold text-[hsl(var(--primary))]">4</span>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))]">Developer Zero Liability & Indemnification</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      The developer bears zero liability for non-payment, disputes, broken items, or in-person interactions. You agree to indemnify and hold harmless the developer against all claims.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600">5</span>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))]">Campus Daylight Meetups</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      Always meet buyers during daylight hours in busy, public campus locations (e.g. campus library, student food court).
                    </p>
                  </div>
                </div>
              </div>

              {/* Checkbox agreement */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.05)] p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sellerAgreed}
                    onChange={(e) => setSellerAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[hsl(var(--primary))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-medium text-[hsl(var(--foreground))] leading-snug">
                    I have read, understand, and agree to the{" "}
                    <Link href="/terms" target="_blank" className="font-bold text-[hsl(var(--primary))] underline">
                      Terms & Fair Use Disclaimer
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" className="font-bold text-[hsl(var(--primary))] underline">
                      Privacy Policy
                    </Link>
                    . I accept all seller rules and platform intermediary terms.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSellerTermsModal(false)}
                  className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!sellerAgreed}
                  onClick={() => {
                    setShowSellerTermsModal(false);
                    setIsSellModalOpen(true);
                  }}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  I Agree & Continue to Listing Form
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Buyer Safety & Intermediary Terms Agreement Dialog */}
        <Dialog open={!!buyerContactTarget} onOpenChange={(open) => !open && setBuyerContactTarget(null)}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">Buyer Safety & Platform Disclaimer</DialogTitle>
                  <DialogDescription className="text-xs">
                    Please review and accept before contacting {buyerContactTarget?.item.sellerName} for &quot;{buyerContactTarget?.item.title}&quot;.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4 space-y-3.5 text-xs text-[hsl(var(--muted-foreground))]">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
                <strong>Campus Trade Intermediary Status:</strong> Nexora functions solely as an unmonetized peer-to-peer bulletin board. The developer does not inspect goods, take payments, or guarantee trades.
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-[10px] font-bold text-[hsl(var(--primary))]">1</span>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))]">Inspect Before You Pay</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      Always physically examine the item in person—check page editions, missing sheets, handwriting legibility, or electronic functionality—before handing over money.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600">2</span>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))]">Public Daylight Campus Meetup</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      Meet only during daytime hours in populated campus areas such as the college library entrance, food court, or departmental foyer. Never meet in secluded off-campus locations.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-red-600">3</span>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))]">Never Send Advance Deposits</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      Do not transfer money via UPI, Google Pay, or bank transfer in advance to &quot;hold&quot; or &quot;reserve&quot; an item. Never share UPI PINs or OTPs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-[10px] font-bold text-[hsl(var(--primary))]">4</span>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))]">Developer Zero Liability</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      The developer accepts zero liability for defective goods, non-delivery, overcharging, fraud, or disputes between buyers and sellers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Checkbox agreement */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.05)] p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={buyerAgreed}
                    onChange={(e) => setBuyerAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[hsl(var(--primary))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-medium text-[hsl(var(--foreground))] leading-snug">
                    I have read, understand, and agree to the{" "}
                    <Link href="/terms" target="_blank" className="font-bold text-[hsl(var(--primary))] underline">
                      Terms & Fair Use Disclaimer
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" className="font-bold text-[hsl(var(--primary))] underline">
                      Privacy Policy
                    </Link>
                    . I acknowledge the safety guidelines and agree that the developer bears zero transaction liability.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBuyerContactTarget(null)}
                  className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!buyerAgreed}
                  onClick={() => {
                    if (buyerContactTarget) {
                      window.open(buyerContactTarget.url, "_blank");
                      setBuyerContactTarget(null);
                      setBuyerAgreed(false);
                    }
                  }}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {buyerContactTarget?.channel === "whatsapp" && <MessageCircle size={14} />}
                  {buyerContactTarget?.channel === "instagram" && <Instagram size={14} />}
                  {buyerContactTarget?.channel === "phone" && <Phone size={14} />}
                  <span>
                    I Agree & Contact on{" "}
                    {buyerContactTarget?.channel === "whatsapp"
                      ? "WhatsApp"
                      : buyerContactTarget?.channel === "instagram"
                      ? "Instagram"
                      : "Phone"}
                  </span>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sell an Item Dialog */}
        <SellItemDialog
          open={isSellModalOpen}
          onOpenChange={setIsSellModalOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["marketplace"] });
          }}
        />

        {/* Mark Sold Confirmation Dialog */}
        <Dialog open={!!soldTargetItem} onOpenChange={(open) => !open && setSoldTargetItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Listing as Sold?</DialogTitle>
              <DialogDescription>
                Are you sure you want to mark "{soldTargetItem?.title}" as sold? Buyers will no longer reach out regarding this item.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSoldTargetItem(null)}
                className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={markSoldMutation.isPending}
                onClick={() => {
                  if (soldTargetItem) {
                    markSoldMutation.mutate(soldTargetItem.id);
                  }
                }}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {markSoldMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                Yes, Mark as Sold
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Dialog Component for Creating a New Listing with Direct In-Site Photo Upload
function SellItemDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("Textbooks");
  const [condition, setCondition] = useState<string>("Good");
  const [price, setPrice] = useState<string>("");
  const [campusLocation, setCampusLocation] = useState("Campus Library");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerContact, setSellerContact] = useState("");
  const [sellerInstagram, setSellerInstagram] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showUrlOption, setShowUrlOption] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("Textbooks");
    setCondition("Good");
    setPrice("");
    setCampusLocation("Campus Library");
    setBranch("");
    setSemester("");
    setSellerName("");
    setSellerContact("");
    setSellerInstagram("");
    setSellerEmail("");
    setImagePreview(null);
    setManualImageUrl("");
    setShowUrlOption(false);
    setTermsAgreed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please choose an image file (JPEG, PNG, WebP).", variant: "destructive" });
      return;
    }

    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressImage(file);
      setImagePreview(compressedDataUrl);
      setManualImageUrl("");
    } catch (err) {
      toast({ title: "Image Error", description: "Could not process selected image.", variant: "destructive" });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim() || title.trim().length < 3) {
      toast({ title: "Validation Error", description: "Title must be at least 3 characters.", variant: "destructive" });
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      toast({ title: "Validation Error", description: "Description must be at least 5 characters.", variant: "destructive" });
      return;
    }
    if (!sellerName.trim()) {
      toast({ title: "Validation Error", description: "Seller name is required.", variant: "destructive" });
      return;
    }
    if (!sellerContact.trim() && !sellerInstagram.trim()) {
      toast({
        title: "Contact Method Required",
        description: "Please provide at least one contact method (WhatsApp phone number or Instagram handle) so buyers can reach you.",
        variant: "destructive"
      });
      return;
    }

    const numericPrice = Number(price);
    if (price !== "" && (Number.isNaN(numericPrice) || numericPrice < 0)) {
      toast({ title: "Validation Error", description: "Please enter a valid price in ₹ (or 0 for Free).", variant: "destructive" });
      return;
    }

    const finalImage = imagePreview || manualImageUrl.trim() || undefined;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          condition,
          price: price === "" ? 0 : numericPrice,
          campusLocation,
          branch: branch.trim() || undefined,
          semester: semester.trim() || undefined,
          sellerName,
          sellerContact,
          sellerInstagram: sellerInstagram.trim() || undefined,
          sellerEmail: sellerEmail.trim() || undefined,
          imageUrl: finalImage,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create listing.");
      }

      toast({
        title: "Listing Created!",
        description: "Your item is now live on the Campus Trade.",
      });
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: (err as Error)?.message || "Failed to post item.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
              <ShoppingBag size={16} />
            </div>
            <div>
              <DialogTitle className="text-lg">Post an Item for Sale</DialogTitle>
              <DialogDescription className="text-xs">
                Sell your textbook, lab kit, calculator, or campus gear to fellow students.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Item Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Higher Engineering Mathematics (B.S. Grewal)"
              className="input-style mt-1 h-9 w-full text-xs"
            />
          </div>

          {/* Photo Upload In Site Itself */}
          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center justify-between">
              <span>Item Photo (Upload from phone/PC)</span>
              <span className="text-[10px] font-normal text-[hsl(var(--muted-foreground))]">Optional</span>
            </label>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative mt-1.5 h-44 w-full overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] group">
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X size={15} />
                </button>
                <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                  Photo attached
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 flex flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-6 text-center hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted)/.3)] transition-all cursor-pointer"
              >
                {isCompressing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={24} className="animate-spin text-[hsl(var(--primary))]" />
                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Optimizing image...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] mb-2">
                      <Camera size={20} />
                    </div>
                    <p className="text-xs font-bold text-[hsl(var(--foreground))]">
                      Click to upload photo or take a picture
                    </p>
                    <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                      Supports JPEG, PNG, WebP (auto-optimized)
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Toggle URL option for users who already have a web link */}
            <div className="mt-1.5 text-right">
              <button
                type="button"
                onClick={() => setShowUrlOption(!showUrlOption)}
                className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline cursor-pointer"
              >
                {showUrlOption ? "Hide URL option" : "Or paste image URL instead"}
              </button>
            </div>

            {showUrlOption && (
              <div className="mt-2">
                <input
                  type="url"
                  value={manualImageUrl}
                  onChange={(e) => {
                    setManualImageUrl(e.target.value);
                    if (e.target.value.trim()) setImagePreview(null);
                  }}
                  placeholder="https://... image link"
                  className="input-style h-8 w-full text-xs"
                />
              </div>
            )}
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-style mt-1 h-9 w-full text-xs cursor-pointer"
              >
                <option value="Textbooks">Textbooks</option>
                <option value="Notes & Binders">Notes & Binders</option>
                <option value="Lab Equipment">Lab Equipment</option>
                <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                <option value="Other Campus Items">Other Campus Items</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Condition *</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="input-style mt-1 h-9 w-full text-xs cursor-pointer"
              >
                <option value="Brand New">Brand New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>

          {/* Price & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Price (₹) *</label>
              <input
                type="number"
                min="0"
                max="50000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0 for Free"
                className="input-style mt-1 h-9 w-full text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Campus Meetup Spot *</label>
              <input
                type="text"
                required
                value={campusLocation}
                onChange={(e) => setCampusLocation(e.target.value)}
                placeholder="e.g. Library, Food Court, Gate 1"
                className="input-style mt-1 h-9 w-full text-xs"
              />
            </div>
          </div>

          {/* Branch & Semester (Optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Branch (Optional)</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. CSE, ECE, Mech"
                className="input-style mt-1 h-9 w-full text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Semester (Optional)</label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. 3rd Sem"
                className="input-style mt-1 h-9 w-full text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Description *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the edition, highlights, annotations, or any included accessories..."
              className="input-style mt-1 w-full p-2 text-xs"
            />
          </div>

          {/* Seller Contact Info & Instagram */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[hsl(var(--foreground))]">Seller Contact Details</p>
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                WhatsApp or Instagram required
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Your Name *</label>
                <input
                  type="text"
                  required
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  placeholder="e.g. Rahul S"
                  className="input-style mt-1 h-8 w-full text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                  <span>WhatsApp Phone</span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground)/.8)]">
                    {sellerInstagram.trim() ? "Optional" : "At least one"}
                  </span>
                </label>
                <input
                  type="tel"
                  value={sellerContact}
                  onChange={(e) => setSellerContact(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="input-style mt-1 h-8 w-full text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Instagram size={11} className="text-pink-600" /> Instagram Handle
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground)/.8)]">
                    {sellerContact.trim() ? "Optional" : "At least one"}
                  </span>
                </label>
                <input
                  type="text"
                  value={sellerInstagram}
                  onChange={(e) => setSellerInstagram(e.target.value)}
                  placeholder="@your_handle or profile link"
                  className="input-style mt-1 h-8 w-full text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">College Email (Optional)</label>
                <input
                  type="email"
                  value={sellerEmail}
                  onChange={(e) => setSellerEmail(e.target.value)}
                  placeholder="pes1ug23cs999@pes.edu"
                  className="input-style mt-1 h-8 w-full text-xs"
                />
              </div>
            </div>
          </div>

          {/* Mandatory Seller Agreement Checkbox */}
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-500 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] cursor-pointer shrink-0"
              />
              <span className="font-medium">
                I certify that I am the owner of this item, all details are truthful, this item does not violate campus rules (no leaked exam papers or prohibited goods), and I agree to the{" "}
                <Link href="/terms" target="_blank" className="font-bold underline">
                  Terms & Fair Use Disclaimer
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="font-bold underline">
                  Privacy Policy
                </Link>
                . I acknowledge that the developer is an intermediary platform bearing zero transaction liability.
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing || !termsAgreed}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              Post Listing
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default MarketplacePage;
