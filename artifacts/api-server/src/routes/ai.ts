import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { eq, ilike, or, and, asc } from "drizzle-orm";
import {
  db,
  branches,
  semesters,
  subjects,
  resources,
  semesterQps,
  iaPapers,
  importantLinks,
  type Branch,
  type Semester,
  type Subject,
  type Resource,
  type SemesterQp,
  type IaPaper,
} from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ============================================================================
// 1. RATE LIMITER (In-memory sliding window: 30 requests/min per IP)
// ============================================================================
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const valid = timestamps.filter((t) => now - t < windowMs);
  if (valid.length >= limit) {
    rateLimitMap.set(ip, valid);
    return false;
  }
  valid.push(now);
  rateLimitMap.set(ip, valid);
  return true;
}

// Clean up stale rate-limit keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of rateLimitMap.entries()) {
    const valid = times.filter((t) => now - t < 60000);
    if (valid.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, valid);
  }
}, 5 * 60 * 1000);

// ============================================================================
// 2. SCHEMAS & TYPES
// ============================================================================
const ChatHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const ContextStateSchema = z.object({
  branch: z.string().optional(),
  semester: z.string().optional(),
  subject: z.string().optional(),
  subjectId: z.number().optional(),
  topic: z.string().optional(),
}).optional();

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(ChatHistoryItemSchema).max(12).optional().default([]),
  contextState: ContextStateSchema,
});

export interface ActionCardData {
  type: "subject" | "pyqs" | "link" | "contribute" | "resources";
  title: string;
  subtitle?: string;
  badge?: string;
  targetUrl: string;
  external?: boolean;
  buttonText: string;
  resources?: Array<{ title: string; url?: string; type: string }>;
}

export interface ChatResponsePayload {
  reply: string;
  actionCard?: ActionCardData;
  quickReplies?: Array<{ label: string; value: string }>;
  updatedContextState: {
    branch?: string;
    semester?: string;
    subject?: string;
    subjectId?: number;
    topic?: string;
  };
  source: "llm" | "academic_engine" | "catalog_search";
}

// ============================================================================
// 3. CATALOG CACHING (Cached for 60 seconds for ultra-fast response times)
// ============================================================================
interface CatalogCache {
  timestamp: number;
  branches: Branch[];
  semesters: Semester[];
  subjects: Subject[];
  resources: Resource[];
  semesterQps: SemesterQp[];
  iaPapers: IaPaper[];
  quickLinks: Array<typeof importantLinks.$inferSelect>;
}

let catalogCache: CatalogCache | null = null;

async function getCachedCatalog(): Promise<CatalogCache> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.timestamp < 60000) {
    return catalogCache;
  }

  const [
    allBranches,
    allSemesters,
    allSubjects,
    allResources,
    allSemesterQps,
    allIaPapers,
    allQuickLinks,
  ] = await Promise.all([
    db.select().from(branches).where(eq(branches.isActive, true)).orderBy(asc(branches.displayOrder)),
    db.select().from(semesters).orderBy(asc(semesters.displayOrder)),
    db.select().from(subjects).orderBy(asc(subjects.name)),
    db.select().from(resources).orderBy(asc(resources.id)),
    db.select().from(semesterQps).where(eq(semesterQps.isPublished, true)).orderBy(asc(semesterQps.id)),
    db.select().from(iaPapers).where(eq(iaPapers.isPublished, true)).orderBy(asc(iaPapers.id)),
    db.select().from(importantLinks).where(eq(importantLinks.isActive, true)).orderBy(asc(importantLinks.displayOrder)),
  ]);

  catalogCache = {
    timestamp: now,
    branches: allBranches,
    semesters: allSemesters,
    subjects: allSubjects,
    resources: allResources,
    semesterQps: allSemesterQps as unknown as SemesterQp[],
    iaPapers: allIaPapers as unknown as IaPaper[],
    quickLinks: allQuickLinks,
  };

  return catalogCache;
}

// ============================================================================
// 4. NATURAL LANGUAGE CONTEXT EXTRACTORS
// ============================================================================
function extractSemesterNumber(text: string): number | null {
  const norm = text.toLowerCase();
  if (norm.includes("c cycle") || norm.includes("c-cycle") || norm.includes("chem")) return 1;
  if (norm.includes("p cycle") || norm.includes("p-cycle") || norm.includes("phy")) return 2;

  const m =
    norm.match(/\b(?:sem|semester|s)\s*([1-8])\b/) ||
    norm.match(/\b([1-8])(?:st|nd|rd|th)?\s*(?:sem|semester)\b/) ||
    norm.match(/\bsem([1-8])\b/) ||
    norm.match(/\bs([1-8])\b/);
  if (m) return parseInt(m[1], 10);

  if (norm.includes("1st") || norm.includes("first")) return 1;
  if (norm.includes("2nd") || norm.includes("second")) return 2;
  if (norm.includes("3rd") || norm.includes("third")) return 3;
  if (norm.includes("4th") || norm.includes("fourth")) return 4;
  if (norm.includes("5th") || norm.includes("fifth")) return 5;
  if (norm.includes("6th") || norm.includes("sixth")) return 6;
  if (norm.includes("7th") || norm.includes("seventh")) return 7;
  if (norm.includes("8th") || norm.includes("eighth")) return 8;

  const digit = norm.match(/^\s*([1-8])\s*$/);
  if (digit) return parseInt(digit[1], 10);

  return null;
}

function extractBranchName(text: string): string | null {
  const norm = text.toLowerCase();
  if (norm.includes("cse") || norm.includes("computer science")) return "CSE";
  if (norm.includes("aiml") || norm.includes("ai & ml") || norm.includes("ai ml") || norm.includes("artificial intelligence")) return "AIML";
  if (norm.includes("ise") || norm.includes("information science")) return "ISE";
  if (norm.includes("ece") || norm.includes("electronics")) return "ECE";
  if (norm.includes("eee") || norm.includes("electrical")) return "EEE";
  if (norm.includes("mech") || norm.includes("mechanical")) return "MECH";
  if (norm.includes("civil")) return "CIVIL";
  if (norm.includes("data science") || norm.includes("ds")) return "DS";
  return null;
}

function semNumToLabel(n: number): string {
  const suffixes = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
  return `${suffixes[n] || n + "th"} Sem`;
}

function semNumToFullLabel(n: number): string {
  const suffixes = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
  return `${suffixes[n] || n + "th"} Semester`;
}

// ============================================================================
// 5. DETERMINISTIC ACADEMIC KNOWLEDGE & TUTORING ENGINE
// ============================================================================
interface AcademicTopic {
  id: string;
  keywords: string[];
  title: string;
  explanation: string;
  codeSnippet?: { language: string; code: string };
  examTips: string;
  practiceQuestion: string;
}

const ACADEMIC_TOPICS: AcademicTopic[] = [
  {
    id: "recursion",
    keywords: ["recursion", "recursive", "base case", "call stack"],
    title: "Understanding Recursion & Base Conditions",
    explanation:
      "**Recursion** is a programming technique where a function solves a problem by calling a smaller instance of itself.\n\n" +
      "Every correct recursive algorithm requires two critical components:\n" +
      "1. **Base Case:** A terminating condition that stops recursion immediately without making further calls. Without this, you get a `StackOverflowError`.\n" +
      "2. **Recursive Step:** Progressively smaller inputs moving towards the base case.",
    codeSnippet: {
      language: "java",
      code: `// Classic Factorial in Java with Base Case
public class FactorialExample {
    public static int factorial(int n) {
        // 1. Base Case: stop when n <= 1
        if (n <= 1) {
            return 1;
        }
        // 2. Recursive Step: n * factorial(n - 1)
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        int result = factorial(5); // 5 * 4 * 3 * 2 * 1 = 120
        System.out.println("5! = " + result);
    }
}`,
    },
    examTips:
      "💡 **Exam Answer Tip (VTU/BITM Autonomous):** Always draw the **Recursion Call Stack Trace Tree**. Mention the time complexity ($O(n)$) and auxiliary stack space ($O(n)$). Highlight the base case explicitly.",
    practiceQuestion:
      "**Practice Challenge:** Write a recursive function to find the $n$-th Fibonacci number, and explain why naive recursion is $O(2^n)$ versus $O(n)$ with memoization.",
  },
  {
    id: "dsa_trees",
    keywords: ["tree", "binary tree", "bst", "binary search tree", "inorder", "preorder", "postorder", "traversal"],
    title: "Binary Trees & BST Traversals",
    explanation:
      "A **Binary Search Tree (BST)** is a hierarchical node structure where:\n" +
      "- Every left child value is **less than** its parent node.\n" +
      "- Every right child value is **greater than** its parent node.\n\n" +
      "**Tree Traversals (Depth-First):**\n" +
      "- **Inorder (L, Root, R):** Produces elements in strictly sorted ascending order.\n" +
      "- **Preorder (Root, L, R):** Used to clone or serialize tree structure.\n" +
      "- **Postorder (L, R, Root):** Used for bottom-up cleanup and mathematical expression trees.",
    codeSnippet: {
      language: "c",
      code: `// Inorder Traversal in C
#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *left, *right;
};

void inorder(struct Node* root) {
    if (root == NULL) return; // Base condition
    inorder(root->left);       // Left
    printf("%d ", root->data); // Visit
    inorder(root->right);      // Right
}`,
    },
    examTips:
      "💡 **Exam Tip:** In semester exams, questions frequently ask to construct a Binary Tree given **Preorder + Inorder** sequences. Remember: The first element of Preorder is always the root!",
    practiceQuestion:
      "**Practice Question:** Given Inorder: `[4, 2, 5, 1, 6, 3]` and Preorder: `[1, 2, 4, 5, 3, 6]`, draw the unique binary tree.",
  },
  {
    id: "os_deadlocks",
    keywords: ["deadlock", "banker", "banker's algorithm", "mutual exclusion", "hold and wait", "circular wait"],
    title: "Operating Systems: Deadlock & Coffman Conditions",
    explanation:
      "A **Deadlock** is a state where a set of processes are blocked because each process holds a resource and waits for another resource held by another process.\n\n" +
      "**The 4 Coffman Conditions (Must ALL hold simultaneously for deadlock):**\n" +
      "1. **Mutual Exclusion:** At least one resource is non-shareable.\n" +
      "2. **Hold and Wait:** A process currently holding resources can request new ones.\n" +
      "3. **No Preemption:** Resources cannot be forcibly seized; only released voluntarily.\n" +
      "4. **Circular Wait:** A closed chain of processes where each waits for a resource held by the next.",
    examTips:
      "💡 **Exam Answer Tip:** Whenever Deadlock appears on a 10-mark question, list all 4 Coffman conditions with a Resource Allocation Graph (RAG) diagram, and explain the Banker's Algorithm safety check vector (`Need = Max - Allocation`).",
    practiceQuestion:
      "**Practice Question:** State and prove how eliminating 'Circular Wait' via global linear resource ordering prevents deadlocks.",
  },
  {
    id: "ddco_kmaps",
    keywords: ["kmap", "karnaugh", "boolean", "sop", "pos", "minterm", "maxterm", "logic gate"],
    title: "Digital Design: Karnaugh Maps (K-Maps) & Minimization",
    explanation:
      "A **K-Map (Karnaugh Map)** provides a systematic graphical method to simplify Boolean algebra expressions without manual algebraic theorems.\n\n" +
      "**Key Rules of K-Map Grouping:**\n" +
      "1. Groups must contain $2^n$ cells ($1, 2, 4, 8, 16$).\n" +
      "2. Cells are arranged in **Gray Code** sequence (`00, 01, 11, 10`) so only 1 bit changes between adjacent cells.\n" +
      "3. Groups can wrap around edges and corners.\n" +
      "4. Always identify Essential Prime Implicants (EPIs) first.",
    examTips:
      "💡 **Exam Tip:** Do not group 3 or 6 cells! Double-check the column labels: ensure `11` comes before `10` (Gray code ordering). Don't-care conditions ($X$) should only be grouped if they enlarge a group of 1s.",
    practiceQuestion:
      "**Practice Problem:** Minimize the 4-variable function: $F(A,B,C,D) = \\Sigma m(0, 2, 5, 7, 8, 10, 13, 15)$ using a 4-variable K-Map.",
  },
  {
    id: "cn_layers",
    keywords: ["osi", "tcp/ip", "tcp vs udp", "osi model", "transport layer", "three way handshake"],
    title: "Computer Networks: OSI 7-Layer Model & TCP vs UDP",
    explanation:
      "**The OSI 7-Layer Model:**\n" +
      "1. **Physical:** Raw bit transmission (cables, voltages, hubs).\n" +
      "2. **Data Link:** Framing & MAC addressing, error detection (Ethernet, switches).\n" +
      "3. **Network:** Logical IP routing & path determination (Routers, IP, ICMP).\n" +
      "4. **Transport:** End-to-end reliability, segmentation & port numbers (TCP, UDP).\n" +
      "5. **Session:** Dialog control and session tokens.\n" +
      "6. **Presentation:** Encryption, data compression, serialization (TLS, JPEG).\n" +
      "7. **Application:** User network services (HTTP, DNS, SMTP, FTP).\n\n" +
      "**TCP vs UDP:**\n" +
      "- **TCP:** Connection-oriented (3-way handshake `SYN -> SYN-ACK -> ACK`), guaranteed delivery, flow/congestion control, slower.\n" +
      "- **UDP:** Connectionless, no guarantee, low latency, ideal for video streaming, gaming, and DNS.",
    examTips:
      "💡 **Exam Tip:** Draw the full 7-layer stack side-by-side with TCP/IP (4 layers) and note the PDU at each layer: Frame $\\rightarrow$ Packet $\\rightarrow$ Segment $\\rightarrow$ Data.",
    practiceQuestion:
      "**Practice Question:** Explain TCP 3-way handshake with a sequence diagram and explain why 2 handshakes are insufficient.",
  },
  {
    id: "dbms_normalization",
    keywords: ["normalization", "1nf", "2nf", "3nf", "bcnf", "functional dependency", "acid"],
    title: "DBMS: Normalization & Functional Dependencies",
    explanation:
      "**Normalization** is the process of organizing database relations to minimize data redundancy and eliminate insertion, update, and deletion anomalies.\n\n" +
      "- **1NF:** All column values must be atomic (no multi-valued attributes or repeating groups).\n" +
      "- **2NF:** Must be in 1NF + No **partial dependencies** (no non-prime attribute depends on a proper subset of a composite candidate key).\n" +
      "- **3NF:** Must be in 2NF + No **transitive dependencies** ($X \\rightarrow Y$ and $Y \\rightarrow Z$). Every determinant must be a superkey or the dependent is a prime attribute.\n" +
      "- **BCNF:** For every non-trivial functional dependency $X \\rightarrow Y$, $X$ must be a strict superkey.",
    examTips:
      "💡 **Exam Tip:** Always state the definition of Functional Dependency ($X \\rightarrow Y$) and provide an unnormalized table example showing how decomposing eliminates update anomalies.",
    practiceQuestion:
      "**Practice Problem:** Relation $R(A, B, C, D)$ with FDs: $A \\rightarrow B$, $B \\rightarrow C$, $C \\rightarrow D$. Find the candidate keys and the highest normal form.",
  },
];

function findAcademicMatch(text: string): AcademicTopic | null {
  const norm = text.toLowerCase();
  for (const topic of ACADEMIC_TOPICS) {
    if (topic.keywords.some((k) => norm.includes(k))) {
      return topic;
    }
  }
  return null;
}

// ============================================================================
// 6. EXTERNAL LLM INTEGRATION (Google Gemini 1.5 Flash Free-Tier API)
// ============================================================================
async function callExternalLlm(
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  systemContext: string
): Promise<string | null> {
  const geminiKey = process.env["GEMINI_API_KEY"];
  if (!geminiKey) return null;

  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    // Build dialogue turns with strict alternating user/model roles required by Gemini API
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    // Keep up to 4 recent turns to stay well within free-tier token budgets
    let lastRole: "user" | "model" | null = null;
    for (const h of history.slice(-4)) {
      const role = h.role === "assistant" ? "model" : "user";
      const cleanText = h.content?.trim();
      if (!cleanText) continue;

      if (role !== lastRole) {
        contents.push({ role, parts: [{ text: cleanText }] });
        lastRole = role;
      }
    }

    // Ensure the terminal turn is always the current user request
    if (lastRole === "user" && contents.length > 0) {
      contents[contents.length - 1] = { role: "user", parts: [{ text: userMessage }] };
    } else {
      contents.push({ role: "user", parts: [{ text: userMessage }] });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemContext }],
        },
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
      }),
      signal: AbortSignal.timeout(8500),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && typeof text === "string" && text.trim()) {
        return text.trim();
      }
    } else {
      logger.warn({ status: res.status }, "Gemini API call returned non-200");
    }
  } catch (err) {
    logger.warn({ err }, "Gemini API call failed or timed out; falling back to local engine");
  }

  // Gracefully fallback to the free built-in academic engine and catalog
  return null;
}

// ============================================================================
// 7. MAIN AI CHAT ENDPOINT (POST /api/ai/chat)
// ============================================================================
router.post("/ai/chat", async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
  if (!checkRateLimit(clientIp, 35, 60000)) {
    return res.status(429).json({
      error: "rate_limit_exceeded",
      message: "Too many requests. Please wait a moment before sending another message.",
    });
  }

  const parseResult = ChatRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "invalid_request",
      message: "Invalid chat payload.",
      details: parseResult.error.flatten(),
    });
  }

  const { message, history, contextState = {} } = parseResult.data;
  const rawQuery = message.trim();
  const normQuery = rawQuery.toLowerCase();
  const words = normQuery.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

  try {
    const catalog = await getCachedCatalog();

    // ------------------------------------------------------------------------
    // CONTEXT RESOLUTION ACROSS TURNS
    // ------------------------------------------------------------------------
    let activeSem = extractSemesterNumber(rawQuery);
    let activeBranch = extractBranchName(rawQuery);
    let activeSubject = contextState?.subject;
    let activeSubjectId = contextState?.subjectId;

    // Inherit from contextState if user uses pronouns like "it", "same semester", "that"
    if (activeSem === null && contextState?.semester) {
      activeSem = extractSemesterNumber(contextState.semester);
    }
    if (!activeBranch && contextState?.branch) {
      activeBranch = contextState.branch;
    }

    // Try finding matching subject in catalog
    const matchedSubject = catalog.subjects.find((s) => {
      const sName = s.name.toLowerCase();
      return (
        normQuery.includes(sName) ||
        (normQuery.includes("dsdco") && sName.includes("digital design")) ||
        (normQuery.includes("ddco") && sName.includes("digital design")) ||
        (words.includes("dsa") && sName.includes("data structure")) ||
        (words.includes("maths") && sName.includes("math")) ||
        (words.includes("java") && sName.includes("java")) ||
        (words.includes("os") && sName.includes("operating system"))
      );
    });

    if (matchedSubject) {
      activeSubject = matchedSubject.name;
      activeSubjectId = matchedSubject.id;
    }

    // ------------------------------------------------------------------------
    // ROUTE 1: BITM Autonomous Examination Results Portal (Contineo)
    // ------------------------------------------------------------------------
    if (
      words.includes("result") ||
      words.includes("results") ||
      words.includes("marks") ||
      words.includes("sgpa") ||
      words.includes("cgpa") ||
      words.includes("contineo")
    ) {
      const resultsLink = catalog.quickLinks.find((l) =>
        l.url.toLowerCase().includes("bitmeresults.contineo.in") ||
        l.title.toLowerCase().includes("result")
      );
      const url = resultsLink ? resultsLink.url : "https://bitmeresults.contineo.in/";

      const payload: ChatResponsePayload = {
        reply:
          "🎓 Here is the official **BITM Autonomous Examination Results Portal (Contineo)** link to check your semester results, SGPA, CGPA, and grade sheets:",
        actionCard: {
          type: "link",
          title: "BITM Results Portal (Contineo)",
          subtitle: "Official Autonomous Examination Results • bitmeresults.contineo.in",
          badge: "BITM Official",
          targetUrl: url,
          external: true,
          buttonText: "Open BITM Results Portal ↗",
        },
        quickReplies: [
          { label: "📅 Academic Calendar", value: "academic calendar" },
          { label: "📋 3rd Sem IA Papers", value: "3rd sem ia papers" },
          { label: "📐 Maths Notes", value: "i need maths notes" },
        ],
        updatedContextState: {
          semester: activeSem ? semNumToFullLabel(activeSem) : contextState?.semester,
          branch: activeBranch || contextState?.branch,
          subject: activeSubject,
          subjectId: activeSubjectId,
        },
        source: "catalog_search",
      };
      return res.json(payload);
    }

    // ------------------------------------------------------------------------
    // ROUTE 2: Internal Assessment (IA) Papers Intent
    // ------------------------------------------------------------------------
    const isIaIntent =
      words.includes("ia") ||
      words.includes("internals") ||
      words.includes("internal") ||
      words.includes("cie") ||
      words.includes("midterm") ||
      words.includes("midterms") ||
      normQuery.includes("ia paper") ||
      normQuery.includes("ia papers") ||
      normQuery.includes("internal paper") ||
      normQuery.includes("cie paper") ||
      normQuery.includes("ia 1") ||
      normQuery.includes("ia 2") ||
      normQuery.includes("ia1") ||
      normQuery.includes("ia2");

    if (isIaIntent) {
      if (activeSem !== null) {
        const semStr = semNumToFullLabel(activeSem);
        const semShort = semNumToLabel(activeSem);

        const matchedIa = catalog.iaPapers.filter((p) => {
          const pSem = (p.semester || "").toLowerCase();
          return (
            pSem.includes(`${activeSem}rd`) ||
            pSem.includes(`${activeSem}th`) ||
            pSem.includes(`${activeSem}st`) ||
            pSem.includes(`${activeSem}nd`) ||
            pSem.includes(`sem ${activeSem}`) ||
            pSem.includes(`semester ${activeSem}`) ||
            pSem.includes(`${activeSem}`)
          );
        });

        const directResources = matchedIa.slice(0, 4).map((p) => ({
          title: `${p.iaType ? p.iaType + " • " : ""}${p.title} (${p.department || "All Branches"})`,
          url: p.googleDriveUrl,
          type: "IA Paper",
        }));

        const payload: ChatResponsePayload = {
          reply:
            matchedIa.length > 0
              ? `📋 Here are the official **${semShort} Internal Assessment (IA) Question Papers** from the BITM archive. You can click on any paper to open directly on Google Drive, or explore the full IA repository:`
              : `📋 Here is the **${semShort} Internal Assessment (IA) Papers** section for BITM. Browse all available question paper sets:`,
          actionCard: {
            type: "pyqs",
            title: `${semShort} Internal Assessment (IA) Papers`,
            subtitle:
              matchedIa.length > 0
                ? `${matchedIa.length} IA paper set${matchedIa.length > 1 ? "s" : ""} available • BITM 2022 Scheme`
                : "BITM CIE 1 & CIE 2 test archives",
            badge: `${semShort} IA`,
            targetUrl: `/pyqs?tab=ia&semester=${encodeURIComponent(semStr)}`,
            buttonText: `🎯 Open ${semShort} IA Papers Archive ➔`,
            resources: directResources.length > 0 ? directResources : undefined,
          },
          quickReplies: [
            { label: "1st Sem IA", value: "1st sem ia papers" },
            { label: "2nd Sem IA", value: "2nd sem ia papers" },
            { label: "3rd Sem IA", value: "3rd sem ia papers" },
            { label: "4th Sem IA", value: "4th sem ia papers" },
            { label: "📚 Autonomous PYQs", value: "previous year question papers" },
          ],
          updatedContextState: {
            semester: semStr,
            branch: activeBranch || contextState?.branch,
            subject: activeSubject,
            subjectId: activeSubjectId,
          },
          source: "catalog_search",
        };
        return res.json(payload);
      }

      // No semester specified yet: ask student
      const payload: ChatResponsePayload = {
        reply:
          "📝 Which semester do you need **Internal Assessment (IA) question papers** for?\n\nSelect your semester below to view official IA-1 and IA-2 test papers with direct Google Drive links:",
        actionCard: {
          type: "pyqs",
          title: "BITM IA Question Papers Archive",
          subtitle: "Autonomous IA-1 and IA-2 question paper bundles",
          badge: "IA Papers",
          targetUrl: "/pyqs?tab=ia",
          buttonText: "Browse All IA Papers ➔",
        },
        quickReplies: [
          { label: "1st Sem IA", value: "1st sem ia papers" },
          { label: "2nd Sem IA", value: "2nd sem ia papers" },
          { label: "3rd Sem IA", value: "3rd sem ia papers" },
          { label: "4th Sem IA", value: "4th sem ia papers" },
        ],
        updatedContextState: {
          branch: activeBranch || contextState?.branch,
          subject: activeSubject,
          subjectId: activeSubjectId,
        },
        source: "catalog_search",
      };
      return res.json(payload);
    }

    // ------------------------------------------------------------------------
    // ROUTE 3: End-Semester PYQs Intent
    // ------------------------------------------------------------------------
    const isPyqIntent =
      normQuery.includes("pyq") ||
      normQuery.includes("question paper") ||
      normQuery.includes("previous year") ||
      normQuery.includes("old paper") ||
      words.includes("qp") ||
      normQuery.includes("end sem") ||
      normQuery.includes("exam paper");

    if (isPyqIntent) {
      if (activeSem !== null) {
        const semStr = semNumToFullLabel(activeSem);
        const semShort = semNumToLabel(activeSem);

        const matchedQps = catalog.semesterQps.filter((q) => {
          const qSem = (q.semester || "").toLowerCase();
          return (
            qSem.includes(`${activeSem}rd`) ||
            qSem.includes(`${activeSem}th`) ||
            qSem.includes(`${activeSem}st`) ||
            qSem.includes(`${activeSem}nd`) ||
            qSem.includes(`sem ${activeSem}`) ||
            qSem.includes(`semester ${activeSem}`) ||
            qSem.includes(`${activeSem}`)
          );
        });

        const directResources = matchedQps.slice(0, 4).map((q) => ({
          title: `${q.examYear ? q.examYear + " • " : ""}${q.title} (${q.department || "All"})`,
          url: q.downloadUrl,
          type: "End-Sem PYQ",
        }));

        const payload: ChatResponsePayload = {
          reply:
            matchedQps.length > 0
              ? `📝 Here are the **${semShort} Previous Year Question Papers (PYQs)** from BITM Autonomous Examinations:`
              : `📝 Looking for Previous Year Question Papers? We have BITM Autonomous End-Semester exam papers for **${semShort}**!`,
          actionCard: {
            type: "pyqs",
            title: `${semShort} Question Papers (PYQs)`,
            subtitle:
              matchedQps.length > 0
                ? `${matchedQps.length} exam paper set${matchedQps.length > 1 ? "s" : ""} available`
                : "Autonomous End-Sem exam question paper archive",
            badge: `${semShort} PYQs`,
            targetUrl: `/pyqs?tab=semester&semester=${encodeURIComponent(semStr)}`,
            buttonText: `🎯 Open ${semShort} PYQs Section ➔`,
            resources: directResources.length > 0 ? directResources : undefined,
          },
          quickReplies: [
            { label: `📋 ${semShort} IA Papers`, value: `${semShort.toLowerCase()} ia papers` },
            { label: "1st Sem PYQs", value: "1st sem pyq" },
            { label: "2nd Sem PYQs", value: "2nd sem pyq" },
            { label: "3rd Sem PYQs", value: "3rd sem pyq" },
          ],
          updatedContextState: {
            semester: semStr,
            branch: activeBranch || contextState?.branch,
            subject: activeSubject,
            subjectId: activeSubjectId,
          },
          source: "catalog_search",
        };
        return res.json(payload);
      }

      // If a subject was active from previous turn or current query
      if (activeSubject) {
        const payload: ChatResponsePayload = {
          reply: `📝 Searching Previous Year Question Papers for **${activeSubject}**:`,
          actionCard: {
            type: "pyqs",
            title: `${activeSubject} Question Papers`,
            subtitle: "Autonomous End-Sem Question Papers",
            badge: "Subject PYQ",
            targetUrl: `/pyqs?q=${encodeURIComponent(activeSubject)}`,
            buttonText: `Open ${activeSubject.slice(0, 20)} in PYQs ➔`,
          },
          quickReplies: [
            { label: "📋 IA Papers", value: "ia papers" },
            { label: "📐 Maths Notes", value: "maths notes" },
          ],
          updatedContextState: {
            branch: activeBranch || contextState?.branch,
            subject: activeSubject,
            subjectId: activeSubjectId,
          },
          source: "catalog_search",
        };
        return res.json(payload);
      }
    }

    // ------------------------------------------------------------------------
    // ROUTE 4: Subject Notes & Resource Lookup
    // ------------------------------------------------------------------------
    if (matchedSubject) {
      const subjResources = catalog.resources.filter((r) => r.subjectId === matchedSubject.id);
      const semObj = catalog.semesters.find((s) => s.id === matchedSubject.semesterId);
      const semLabel = semObj ? semObj.name : "Semester";

      const payload: ChatResponsePayload = {
        reply: `🎯 Found **${matchedSubject.name}** (${semLabel}) in our library!${
          subjResources.length > 0
            ? ` There are **${subjResources.length} verified notes & study resources** available.`
            : " You can explore this subject shelf below."
        }`,
        actionCard: {
          type: "subject",
          title: matchedSubject.name,
          subtitle: `${semLabel} • ${subjResources.length} verified materials`,
          badge: semLabel,
          targetUrl: `/subject/${matchedSubject.id}`,
          buttonText: `🎯 Open ${matchedSubject.name.slice(0, 22)} Shelf ➔`,
          resources: subjResources.slice(0, 4).map((r) => ({
            title: r.title,
            url: r.googleDriveUrl,
            type: r.resourceType || "Notes",
          })),
        },
        quickReplies: [
          { label: `📄 ${semLabel} PYQs`, value: `pyqs for ${semLabel}` },
          { label: `📋 ${semLabel} IA Papers`, value: `ia papers for ${semLabel}` },
          { label: "🔍 Search another subject", value: "search another subject" },
        ],
        updatedContextState: {
          semester: semLabel,
          branch: activeBranch || contextState?.branch,
          subject: matchedSubject.name,
          subjectId: matchedSubject.id,
        },
        source: "catalog_search",
      };
      return res.json(payload);
    }

    // ------------------------------------------------------------------------
    // ROUTE 5: Check Free Google Gemini LLM (If GEMINI_API_KEY configured)
    // ------------------------------------------------------------------------
    const systemPrompt = `You are Nexora AI Study Assistant, a friendly, intelligent academic tutor and guide for college engineering students at Ballari Institute of Technology and Management (BITM).
Your goal is to explain difficult academic concepts simply, provide clean code snippets with step-by-step explanations, help prepare for semester exams, and guide students to resources.
Rules:
- Be clear, direct, and encouraging. Answer the question first.
- Use GitHub markdown with bold headers, bullet lists, and fenced code blocks.
- If asked for code, provide clean, idiomatic code with brief explanation and edge cases.
- Never invent fake URLs or fake exam dates. Mention that official syllabus notes are in the Nexora Library.`;

    const llmAnswer = await callExternalLlm(rawQuery, history, systemPrompt);
    if (llmAnswer) {
      const payload: ChatResponsePayload = {
        reply: llmAnswer,
        quickReplies: [
          { label: "📋 3rd Sem IA Papers", value: "3rd sem ia papers" },
          { label: "📐 Maths Notes", value: "i need maths notes" },
          { label: "⚡ DSDCO Notes", value: "dsdco notes" },
        ],
        updatedContextState: {
          semester: activeSem ? semNumToFullLabel(activeSem) : contextState?.semester,
          branch: activeBranch || contextState?.branch,
          subject: activeSubject,
          subjectId: activeSubjectId,
        },
        source: "llm",
      };
      return res.json(payload);
    }

    // ------------------------------------------------------------------------
    // ROUTE 6: Built-in Intelligent Academic Engine
    // ------------------------------------------------------------------------
    const academicMatch = findAcademicMatch(rawQuery);
    if (academicMatch) {
      let fullReply = `### 📘 ${academicMatch.title}\n\n${academicMatch.explanation}\n\n`;
      if (academicMatch.codeSnippet) {
        fullReply += `\`\`\`${academicMatch.codeSnippet.language}\n${academicMatch.codeSnippet.code}\n\`\`\`\n\n`;
      }
      fullReply += `${academicMatch.examTips}\n\n${academicMatch.practiceQuestion}`;

      const payload: ChatResponsePayload = {
        reply: fullReply,
        quickReplies: [
          { label: "📄 Find Related Notes", value: `${academicMatch.keywords[0]} notes` },
          { label: "📋 Practice PYQs", value: `${academicMatch.keywords[0]} pyq` },
          { label: "💡 Explain another concept", value: "explain another concept" },
        ],
        updatedContextState: {
          topic: academicMatch.id,
          semester: activeSem ? semNumToFullLabel(activeSem) : contextState?.semester,
          branch: activeBranch || contextState?.branch,
          subject: activeSubject,
          subjectId: activeSubjectId,
        },
        source: "academic_engine",
      };
      return res.json(payload);
    }

    // ------------------------------------------------------------------------
    // ROUTE 7: Fallback with Intelligent Suggestions
    // ------------------------------------------------------------------------
    const payload: ChatResponsePayload = {
      reply: `🤔 I couldn't find a direct match for *"${rawQuery}"* in the current Nexora library.\n\nHere are some things I can help you with:\n- **Find verified notes:** e.g. *"DSA notes for 3rd sem CSE"*, *"Maths notes"*, *"DSDCO notes"*\n- **Exam preparation:** e.g. *"3rd sem IA papers"*, *"Previous year question papers"*\n- **Academic tutoring:** e.g. *"Explain recursion in simple words"*, *"Difference between TCP and UDP"*, *"Banker's Algorithm in OS"*\n- **Official Portals:** e.g. *"BITM results link"*, *"Academic calendar"*`,
      quickReplies: [
        { label: "📋 3rd Sem IA Papers", value: "3rd sem ia papers" },
        { label: "📐 Maths Notes", value: "i need maths notes" },
        { label: "⚡ DSDCO Notes", value: "dsdco notes" },
        { label: "📊 BITM Results Link", value: "bitm result link" },
      ],
      updatedContextState: {
        semester: activeSem ? semNumToFullLabel(activeSem) : contextState?.semester,
        branch: activeBranch || contextState?.branch,
        subject: activeSubject,
        subjectId: activeSubjectId,
      },
      source: "catalog_search",
    };
    return res.json(payload);
  } catch (error) {
    logger.error({ err: error }, "Error in AI chat route");
    return res.status(500).json({
      error: "ai_service_error",
      message: "An error occurred while processing your message. Please try again.",
    });
  }
});

export default router;
