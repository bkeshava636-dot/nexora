import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import {
  db,
  ensureTables,
  marketplaceItems,
  marketplaceCategoryValues,
  marketplaceConditionValues,
  type MarketplaceCategory,
  type MarketplaceCondition,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// In-memory fallback for local development or when PostgreSQL is offline
interface InMemItem {
  id: number;
  title: string;
  description: string;
  category: MarketplaceCategory;
  price: number;
  condition: MarketplaceCondition;
  sellerName: string;
  sellerContact: string;
  sellerInstagram?: string | null;
  sellerEmail: string | null;
  campusLocation: string;
  branch: string | null;
  semester: string | null;
  imageUrl: string | null;
  status: "active" | "sold" | "hidden";
  createdAt: Date;
  updatedAt: Date;
}

const inMemoryItems: InMemItem[] = [
  {
    id: 1,
    title: "Higher Engineering Mathematics (44th Edition) - B.S. Grewal",
    description: "Prescribed textbook for 1st & 2nd year Engineering Maths. Clean copy, minimal pencil marks, binding is intact.",
    category: "Textbooks",
    price: 350,
    condition: "Good",
    sellerName: "Aditya K",
    sellerContact: "9876543210",
    sellerInstagram: "aditya_pes",
    sellerEmail: "aditya.k@pes.edu",
    campusLocation: "Library Ground Floor",
    branch: "CSE",
    semester: "2nd Semester",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: new Date(Date.now() - 3600000 * 24 * 2),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 2),
  },
  {
    id: 2,
    title: "Casio fx-991EX Classwiz Scientific Calculator",
    description: "High-resolution solar + battery scientific calculator. Permitted in VTU/PES internal and semester examinations.",
    category: "Electronics & Gadgets",
    price: 650,
    condition: "Like New",
    sellerName: "Pooja Hegde",
    sellerContact: "9123456780",
    sellerInstagram: "pooja_hegde_23",
    sellerEmail: "pooja.h@pes.edu",
    campusLocation: "Food Court (Near Block B)",
    branch: "ECE",
    semester: "3rd Semester",
    imageUrl: "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: new Date(Date.now() - 3600000 * 24),
    updatedAt: new Date(Date.now() - 3600000 * 24),
  },
  {
    id: 3,
    title: "Mini Engineering Drafter with Sheet Clips & Tube",
    description: "Complete CAED kit used for Computer Aided Engineering Drawing lab in first year. Smooth arm movement.",
    category: "Lab Equipment",
    price: 250,
    condition: "Good",
    sellerName: "Varun Sharma",
    sellerContact: "9845012345",
    sellerInstagram: "varun_pesu",
    sellerEmail: "varun.s@pes.edu",
    campusLocation: "Tech Block Ground Floor",
    branch: "Mechanical",
    semester: "1st Semester",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: new Date(Date.now() - 3600000 * 12),
    updatedAt: new Date(Date.now() - 3600000 * 12),
  },
  {
    id: 4,
    title: "Handwritten Spiral Notes - Data Structures & Algorithms",
    description: "Detailed module 1-5 handwritten notes with complete diagrammatic dry runs of trees, graphs, and dynamic programming.",
    category: "Notes & Binders",
    price: 100,
    condition: "Like New",
    sellerName: "Sneha Reddy",
    sellerContact: "9880098800",
    sellerInstagram: "sneha_r_pes",
    sellerEmail: "sneha.r@pes.edu",
    campusLocation: "Library Quiet Study Zone",
    branch: "AIML",
    semester: "3rd Semester",
    imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: new Date(Date.now() - 3600000 * 4),
    updatedAt: new Date(Date.now() - 3600000 * 4),
  },
];
let nextInMemId = 5;

// Helper to filter in-memory items
function getFilteredInMemoryItems(query: any, isAdmin: boolean) {
  const { category, search, branch, semester, condition, status } = query;

  return inMemoryItems
    .filter((item) => {
      if (!isAdmin) {
        if (status === "sold") {
          if (item.status !== "sold") return false;
        } else if (status === "all") {
          // Allow all items (both active and sold)
        } else {
          if (item.status !== "active") return false;
        }
      } else if (typeof status === "string" && status.trim() && status !== "all") {
        if (item.status !== status.trim()) return false;
      }

      if (typeof category === "string" && category.trim() && category.trim().toLowerCase() !== "all") {
        if (item.category !== category.trim()) return false;
      }

      if (typeof branch === "string" && branch.trim() && branch.trim().toLowerCase() !== "all") {
        if (!item.branch || item.branch.toLowerCase() !== branch.trim().toLowerCase()) return false;
      }

      if (typeof semester === "string" && semester.trim() && semester.trim().toLowerCase() !== "all") {
        if (!item.semester || item.semester.toLowerCase() !== semester.trim().toLowerCase()) return false;
      }

      if (typeof condition === "string" && condition.trim() && condition.trim().toLowerCase() !== "all") {
        if (item.condition !== condition.trim()) return false;
      }

      if (typeof search === "string" && search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.campusLocation.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.sellerInstagram && item.sellerInstagram.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// 1. GET /api/marketplace (Public & Admin)
router.get("/marketplace", async (req, res) => {
  const { category, search, branch, semester, condition, status } = req.query;

  // Use in-memory fallback if no DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    res.json(getFilteredInMemoryItems(req.query, !!req.admin));
    return;
  }

  try {
    const conditions = [];

    if (!req.admin) {
      if (typeof status === "string" && status === "sold") {
        conditions.push(eq(marketplaceItems.status, "sold"));
      } else if (typeof status === "string" && status === "all") {
        // Return both active and sold items
      } else {
        conditions.push(eq(marketplaceItems.status, "active"));
      }
    } else if (typeof status === "string" && status.trim() && status !== "all") {
      conditions.push(eq(marketplaceItems.status, status.trim()));
    }

    if (typeof category === "string" && category.trim() && category.trim().toLowerCase() !== "all") {
      conditions.push(eq(marketplaceItems.category, category.trim()));
    }

    if (typeof branch === "string" && branch.trim() && branch.trim().toLowerCase() !== "all") {
      conditions.push(eq(marketplaceItems.branch, branch.trim()));
    }

    if (typeof semester === "string" && semester.trim() && semester.trim().toLowerCase() !== "all") {
      conditions.push(eq(marketplaceItems.semester, semester.trim()));
    }

    if (typeof condition === "string" && condition.trim() && condition.trim().toLowerCase() !== "all") {
      conditions.push(eq(marketplaceItems.condition, condition.trim()));
    }

    if (typeof search === "string" && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(marketplaceItems.title, q),
          ilike(marketplaceItems.description, q),
          ilike(marketplaceItems.campusLocation, q),
          ilike(marketplaceItems.category, q),
          ilike(marketplaceItems.sellerInstagram, q),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(marketplaceItems)
      .where(where)
      .orderBy(desc(marketplaceItems.createdAt));

    res.json(rows);
  } catch (err: unknown) {
    logger.warn({ err }, "Database fetch failed; serving in-memory marketplace items");
    res.json(getFilteredInMemoryItems(req.query, !!req.admin));
  }
});

// 2. GET /api/marketplace/:id
router.get("/marketplace/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  if (!process.env.DATABASE_URL) {
    const memItem = inMemoryItems.find((i) => i.id === id);
    if (!memItem) {
      res.status(404).json({ error: "not_found", message: "Item not found." });
      return;
    }
    res.json(memItem);
    return;
  }

  try {
    const [row] = await db.select().from(marketplaceItems).where(eq(marketplaceItems.id, id));
    if (!row) {
      const memItem = inMemoryItems.find((i) => i.id === id);
      if (memItem) {
        res.json(memItem);
        return;
      }
      res.status(404).json({ error: "not_found", message: "Item not found." });
      return;
    }
    res.json(row);
  } catch (err: unknown) {
    const memItem = inMemoryItems.find((i) => i.id === id);
    if (memItem) {
      res.json(memItem);
      return;
    }
    res.status(404).json({ error: "not_found", message: "Item not found." });
  }
});

// 3. POST /api/marketplace (Public create listing)
router.post("/marketplace", async (req, res) => {
  const {
    title,
    description,
    category,
    price,
    condition,
    sellerName,
    sellerContact,
    sellerInstagram,
    sellerEmail,
    campusLocation,
    branch,
    semester,
    imageUrl,
  } = req.body ?? {};

  if (!title || typeof title !== "string" || title.trim().length < 3) {
    res.status(400).json({ error: "invalid_request", message: "Title must be at least 3 characters." });
    return;
  }
  if (!description || typeof description !== "string" || description.trim().length < 5) {
    res.status(400).json({ error: "invalid_request", message: "Description must be at least 5 characters." });
    return;
  }
  if (!sellerName || typeof sellerName !== "string" || sellerName.trim().length < 2) {
    res.status(400).json({ error: "invalid_request", message: "Seller name is required." });
    return;
  }

  const cleanContact = typeof sellerContact === "string" && sellerContact.trim().length >= 5
    ? sellerContact.trim().slice(0, 50)
    : "";

  const cleanInstagram = typeof sellerInstagram === "string" && sellerInstagram.trim()
    ? sellerInstagram.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "")
    : null;

  if (!cleanContact && !cleanInstagram) {
    res.status(400).json({
      error: "invalid_request",
      message: "At least one contact method (WhatsApp phone number or Instagram handle) is required.",
    });
    return;
  }

  const rawPrice = Number(price);
  if (Number.isNaN(rawPrice) || rawPrice < 0 || rawPrice > 50000) {
    res.status(400).json({ error: "invalid_request", message: "Price must be a valid number between 0 and 50,000." });
    return;
  }

  const validCategory = (marketplaceCategoryValues as readonly string[]).includes(category)
    ? (category as MarketplaceCategory)
    : "Textbooks";

  const validCondition = (marketplaceConditionValues as readonly string[]).includes(condition)
    ? (condition as MarketplaceCondition)
    : "Good";

  const payload = {
    title: title.trim().slice(0, 150),
    description: description.trim().slice(0, 1500),
    category: validCategory,
    price: Math.round(rawPrice),
    condition: validCondition,
    sellerName: sellerName.trim().slice(0, 80),
    sellerContact: cleanContact,
    sellerInstagram: cleanInstagram,
    sellerEmail: typeof sellerEmail === "string" && sellerEmail.trim() ? sellerEmail.trim().slice(0, 100) : null,
    campusLocation: typeof campusLocation === "string" && campusLocation.trim() ? campusLocation.trim().slice(0, 80) : "Campus Library",
    branch: typeof branch === "string" && branch.trim() ? branch.trim().slice(0, 50) : null,
    semester: typeof semester === "string" && semester.trim() ? semester.trim().slice(0, 50) : null,
    imageUrl: typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
    status: "active" as const,
  };

  // Always store in memory for local fallback
  const memItem: InMemItem = {
    id: nextInMemId++,
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  inMemoryItems.unshift(memItem);

  if (!process.env.DATABASE_URL) {
    res.status(201).json(memItem);
    return;
  }

  try {
    try {
      const [created] = await db.insert(marketplaceItems).values(payload).returning();
      res.status(201).json(created);
    } catch (insertErr: unknown) {
      const pgErr = (insertErr as { cause?: { code?: string }; code?: string })?.cause || (insertErr as { code?: string });
      if (pgErr?.code === "42P01") {
        await ensureTables();
        const [created] = await db.insert(marketplaceItems).values(payload).returning();
        res.status(201).json(created);
        return;
      }
      res.status(201).json(memItem);
    }
  } catch (err: unknown) {
    res.status(201).json(memItem);
  }
});

// 4. PATCH /api/marketplace/:id/sold (Mark item as sold)
router.patch("/marketplace/:id/sold", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  const memItem = inMemoryItems.find((i) => i.id === id);
  if (memItem) {
    memItem.status = "sold";
    memItem.updatedAt = new Date();
  }

  if (!process.env.DATABASE_URL) {
    if (!memItem) {
      res.status(404).json({ error: "not_found", message: "Item not found." });
      return;
    }
    res.json(memItem);
    return;
  }

  try {
    const [updated] = await db
      .update(marketplaceItems)
      .set({ status: "sold", updatedAt: new Date() })
      .where(eq(marketplaceItems.id, id))
      .returning();

    if (!updated && !memItem) {
      res.status(404).json({ error: "not_found", message: "Item not found." });
      return;
    }

    res.json(updated || memItem);
  } catch (err: unknown) {
    if (memItem) {
      res.json(memItem);
      return;
    }
    res.status(500).json({ error: "internal_error", message: "Failed to update item status." });
  }
});

// 5. DELETE /api/marketplace/:id (Admin moderation only)
router.delete("/marketplace/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  const memIdx = inMemoryItems.findIndex((i) => i.id === id);
  if (memIdx !== -1) {
    inMemoryItems.splice(memIdx, 1);
  }

  if (!process.env.DATABASE_URL) {
    res.status(204).end();
    return;
  }

  try {
    await db.delete(marketplaceItems).where(eq(marketplaceItems.id, id));
    res.status(204).end();
  } catch (err: unknown) {
    res.status(204).end();
  }
});

// 6. GET /api/admin/marketplace (Admin view all listings)
router.get("/admin/marketplace", requireAdmin, async (req, res) => {
  const { category, search, branch, semester, condition, status } = req.query;

  if (!process.env.DATABASE_URL) {
    res.json(getFilteredInMemoryItems(req.query, true));
    return;
  }

  try {
    const conditions = [];

    if (typeof status === "string" && status.trim() && status !== "all") {
      conditions.push(eq(marketplaceItems.status, status.trim()));
    }

    if (typeof category === "string" && category.trim() && category.trim().toLowerCase() !== "all") {
      conditions.push(eq(marketplaceItems.category, category.trim()));
    }

    if (typeof branch === "string" && branch.trim() && branch.trim().toLowerCase() !== "all") {
      conditions.push(eq(marketplaceItems.branch, branch.trim()));
    }

    if (typeof semester === "string" && semester.trim() && semester.trim().toLowerCase() !== "all") {
      conditions.push(eq(marketplaceItems.semester, semester.trim()));
    }

    if (typeof condition === "string" && condition.trim() && condition.trim().toLowerCase() !== "all") {
      conditions.push(eq(marketplaceItems.condition, condition.trim()));
    }

    if (typeof search === "string" && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(marketplaceItems.title, q),
          ilike(marketplaceItems.description, q),
          ilike(marketplaceItems.campusLocation, q),
          ilike(marketplaceItems.category, q),
          ilike(marketplaceItems.sellerName, q),
          ilike(marketplaceItems.sellerContact, q),
          ilike(marketplaceItems.sellerInstagram, q),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(marketplaceItems)
      .where(where)
      .orderBy(desc(marketplaceItems.createdAt));

    res.json(rows);
  } catch (err: unknown) {
    logger.warn({ err }, "Admin database fetch failed; serving in-memory marketplace items");
    res.json(getFilteredInMemoryItems(req.query, true));
  }
});

// 7. PATCH /api/admin/marketplace/:id/status (Admin toggle active/sold)
router.patch("/admin/marketplace/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  const validStatus = status === "sold" ? "sold" : "active";

  const memItem = inMemoryItems.find((i) => i.id === id);
  if (memItem) {
    memItem.status = validStatus;
    memItem.updatedAt = new Date();
  }

  if (!process.env.DATABASE_URL) {
    if (!memItem) {
      res.status(404).json({ error: "not_found", message: "Item not found." });
      return;
    }
    res.json(memItem);
    return;
  }

  try {
    const [updated] = await db
      .update(marketplaceItems)
      .set({ status: validStatus, updatedAt: new Date() })
      .where(eq(marketplaceItems.id, id))
      .returning();

    if (!updated && !memItem) {
      res.status(404).json({ error: "not_found", message: "Item not found." });
      return;
    }

    res.json(updated || memItem);
  } catch (err: unknown) {
    if (memItem) {
      res.json(memItem);
      return;
    }
    res.status(500).json({ error: "internal_error", message: "Failed to update item status." });
  }
});

// 8. DELETE /api/admin/marketplace/:id (Admin delete alias)
router.delete("/admin/marketplace/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  const memIdx = inMemoryItems.findIndex((i) => i.id === id);
  if (memIdx !== -1) {
    inMemoryItems.splice(memIdx, 1);
  }

  if (!process.env.DATABASE_URL) {
    res.status(204).end();
    return;
  }

  try {
    await db.delete(marketplaceItems).where(eq(marketplaceItems.id, id));
    res.status(204).end();
  } catch (err: unknown) {
    res.status(204).end();
  }
});

export default router;
