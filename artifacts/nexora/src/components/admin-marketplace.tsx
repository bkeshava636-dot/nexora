import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ShoppingBag,
  Search,
  CheckCircle,
  RotateCcw,
  Trash2,
  ExternalLink,
  MapPin,
  MessageCircle,
  Instagram,
  Phone,
  Mail,
  Tag,
  Package,
  IndianRupee,
  Loader2,
  AlertTriangle,
  X,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { customFetch, type MarketplaceItem } from "@workspace/api-client-react";

export function AdminMarketplace() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "sold">("all");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [deleteTargetItem, setDeleteTargetItem] = useState<MarketplaceItem | null>(null);

  const queryClient = useQueryClient();

  // Fetch admin marketplace items with credentials and remote base URL support
  const { data: items = [], isLoading, isError, refetch } = useQuery<MarketplaceItem[]>({
    queryKey: ["admin-marketplace", filterStatus],
    queryFn: async () => {
      const adminUrl = filterStatus === "all"
        ? "/api/admin/marketplace?status=all"
        : `/api/admin/marketplace?status=${filterStatus}`;

      try {
        return await customFetch<MarketplaceItem[]>(adminUrl);
      } catch {
        // Fallback to public route if admin endpoint is unauthorized or unmounted
      }

      // Public fallback route
      const fallbackUrl = filterStatus === "all"
        ? "/api/marketplace?status=all"
        : `/api/marketplace?status=${filterStatus}`;
      return await customFetch<MarketplaceItem[]>(fallbackUrl);
    },
  });

  // Toggle status mutation (active <-> sold)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: "active" | "sold" }) => {
      try {
        return await customFetch<MarketplaceItem>(`/api/admin/marketplace/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (err) {
        // Fallback to /api/marketplace/:id/sold
        if (newStatus === "sold") {
          return await customFetch<MarketplaceItem>(`/api/marketplace/${id}/sold`, {
            method: "PATCH",
          });
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Status Updated",
        description: `Listing marked as ${variables.newStatus}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Update Failed",
        description: err.message || "Could not update status.",
        variant: "destructive",
      });
    },
  });

  // Delete listing mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        return await customFetch<{ success: boolean }>(`/api/admin/marketplace/${id}`, {
          method: "DELETE",
        });
      } catch {
        return await customFetch<{ success: boolean }>(`/api/marketplace/${id}`, {
          method: "DELETE",
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Listing Removed",
        description: "The item has been permanently removed from the catalog.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace"] });
      setDeleteTargetItem(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Deletion Failed",
        description: err.message || "Could not remove listing.",
        variant: "destructive",
      });
    },
  });

  // Filter listings
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchStatus = filterStatus === "all" || item.status === filterStatus;
      const matchCategory = filterCategory === "All" || item.category === filterCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.sellerName.toLowerCase().includes(q) ||
        item.campusLocation.toLowerCase().includes(q) ||
        (item.sellerContact && item.sellerContact.toLowerCase().includes(q)) ||
        (item.sellerInstagram && item.sellerInstagram.toLowerCase().includes(q)) ||
        (item.branch && item.branch.toLowerCase().includes(q));
      return matchStatus && matchCategory && matchSearch;
    });
  }, [items, filterStatus, filterCategory, search]);

  // Metrics summary
  const counts = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.status === "active").length;
    const sold = items.filter((i) => i.status === "sold").length;
    const totalValue = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
    return { total, active, sold, totalValue };
  }, [items]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category) set.add(item.category);
    }
    return ["All", ...Array.from(set)];
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--muted-foreground))]">
            <ShoppingBag size={15} className="text-[hsl(var(--primary))]" /> Classifieds Management
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Campus Trade Moderation</h2>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Review, verify, mark sold, or remove peer-to-peer student listings across the campus catalog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            target="_blank"
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-bold hover:border-[hsl(var(--primary))] transition-colors"
          >
            <ExternalLink size={13} /> View Live Storefront
          </Link>
        </div>
      </div>

      {/* Metrics Row with matching design system icon badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Listings</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
              <Package size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">{counts.total}</p>
          <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">All registered items</p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Listings</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{counts.active}</p>
          <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">Currently browsable</p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sold Archive</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Tag size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{counts.sold}</p>
          <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">Completed trades</p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Catalog Value</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]">
              <IndianRupee size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[hsl(var(--primary))]">₹{counts.totalValue.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">Combined asking price</p>
        </div>
      </div>

      {/* Search & Status Filters Bar (Fixed Alignment and Centered Icons) */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input with properly flex-centered icon */}
          <div className="relative flex-1 max-w-xl">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[hsl(var(--muted-foreground))]">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, seller, phone, Instagram, or location..."
              className="input-style h-10 w-full !pl-10 !pr-9 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="focus-ring absolute inset-y-0 right-0 flex items-center pr-3 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right Controls: Status Tabs & Category Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Status Tabs */}
            <div className="flex rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] p-1">
              {(["all", "active", "sold"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors cursor-pointer ${
                    filterStatus === s
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  }`}
                >
                  {s} {s === "active" && counts.active > 0 ? `(${counts.active})` : ""}
                </button>
              ))}
            </div>

            {/* Category Dropdown */}
            <div className="min-w-[140px]">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input-style h-10 w-full px-3 text-xs cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <Loader2 className="animate-spin text-[hsl(var(--primary))]" size={24} />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-xs text-red-600">
          Failed to load marketplace listings.{" "}
          <button onClick={() => refetch()} className="font-bold underline cursor-pointer ml-1">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center">
          <ShoppingBag className="mx-auto mb-2 text-[hsl(var(--muted-foreground))]" size={32} />
          <p className="text-sm font-bold text-[hsl(var(--foreground))]">No Listings Found</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {search || filterCategory !== "All" || filterStatus !== "all"
              ? "No items match your active filters. Try broadening your search query."
              : "No campus trade items have been posted yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const isSold = item.status === "sold";
            const cleanPhone = item.sellerContact ? item.sellerContact.replace(/\D/g, "") : "";
            const waUrl = cleanPhone.length >= 10
              ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}`
              : null;
            const instaHandle = item.sellerInstagram
              ? item.sellerInstagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "")
              : null;
            const instaUrl = instaHandle ? `https://instagram.com/${instaHandle}` : null;

            return (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-xs transition-all hover:shadow-md ${
                  isSold ? "opacity-75 border-dashed border-[hsl(var(--border))]" : "border-[hsl(var(--border))]"
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--foreground))]">
                      <Tag size={10} className="text-[hsl(var(--primary))]" /> {item.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                        {item.condition}
                      </span>
                      {isSold ? (
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          SOLD
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail (if present) */}
                  {item.imageUrl && (
                    <div className="mb-3 h-36 w-full overflow-hidden rounded-xl bg-[hsl(var(--muted)/.4)] border border-[hsl(var(--border)/.6)]">
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
                    <h3 className="text-sm font-bold tracking-tight text-[hsl(var(--foreground))] line-clamp-1">
                      {item.title}
                    </h3>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                      {item.price === 0 ? "Free" : `₹${item.price}`}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Location & Tags */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} className="text-red-500" /> {item.campusLocation}
                    </span>
                    {(item.branch || item.semester) && (
                      <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px]">
                        {[item.branch, item.semester].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>

                  {/* Seller Details Box */}
                  <div className="mt-3 rounded-xl border border-[hsl(var(--border)/.6)] bg-[hsl(var(--muted)/.3)] p-2.5 text-[11px] space-y-1">
                    <p className="font-semibold text-[hsl(var(--foreground))]">Seller: {item.sellerName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[hsl(var(--muted-foreground))]">
                      {item.sellerContact && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={10} /> {item.sellerContact}
                        </span>
                      )}
                      {instaHandle && (
                        <span className="inline-flex items-center gap-1 text-pink-600 dark:text-pink-400 font-medium">
                          <Instagram size={10} /> @{instaHandle}
                        </span>
                      )}
                      {item.sellerEmail && (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={10} /> {item.sellerEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Actions Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border)/.6)] pt-3">
                  <div className="flex items-center gap-1.5">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Chat on WhatsApp"
                        className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                    {instaUrl && (
                      <a
                        href={instaUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Instagram Profile"
                        className="rounded-lg p-1.5 text-pink-600 hover:bg-pink-500/10 transition-colors"
                      >
                        <Instagram size={15} />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Status Button */}
                    <button
                      type="button"
                      disabled={toggleStatusMutation.isPending}
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: item.id,
                          newStatus: isSold ? "active" : "sold",
                        })
                      }
                      title={isSold ? "Reactivate listing" : "Mark as sold"}
                      className={`focus-ring inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                        isSold
                          ? "border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                          : "border border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                      }`}
                    >
                      {isSold ? (
                        <>
                          <RotateCcw size={12} /> Reactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle size={12} /> Mark Sold
                        </>
                      )}
                    </button>

                    {/* Delete Listing Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteTargetItem(item)}
                      title="Permanently remove listing"
                      className="focus-ring rounded-lg p-1 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTargetItem} onOpenChange={(open) => !open && setDeleteTargetItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Remove Marketplace Listing?</DialogTitle>
                <DialogDescription className="text-xs">
                  This action will permanently delete &quot;{deleteTargetItem?.title}&quot; from the catalog.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            Removing this listing will take it down from the public Campus Trade page immediately. This cannot be undone.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTargetItem(null)}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTargetItem) {
                  deleteMutation.mutate(deleteTargetItem.id);
                }
              }}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              {deleteMutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Delete Listing
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default AdminMarketplace;
