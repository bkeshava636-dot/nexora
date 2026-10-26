import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { eq, ilike, or, and, asc } from "drizzle-orm";
import {
  db,
  branches,
  years,
  semesters,
  subjects,
  resources,
  resourceSubjects,
  semesterQps,
  iaPapers,
  importantLinks,
  type Branch,
  type Year,
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
export interface EnrichedSubject extends Subject {
  semesterNum: number;
  semesterName: string;
  branchId: number | null;
  branchShortName: string;
  branchName: string;
  verifiedResourcesCount: number;
  resources: Resource[];
}

interface CatalogCache {
  timestamp: number;
  branches: Branch[];
  years: Year[];
  semesters: Semester[];
  subjects: EnrichedSubject[];
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
    allYears,
    allSemesters,
    allSubjects,
    allResources,
    allResourceSubjects,
    allSemesterQps,
    allIaPapers,
    allQuickLinks,
  ] = await Promise.all([
    db.select().from(branches).where(eq(branches.isActive, true)).orderBy(asc(branches.displayOrder)),
    db.select().from(years).orderBy(asc(years.displayOrder)),
    db.select().from(semesters).orderBy(asc(semesters.displayOrder)),
    db.select().from(subjects).orderBy(asc(subjects.name)),
    db.select().from(resources).where(eq(resources.isVerified, true)).orderBy(asc(resources.id)),
    db.select().from(resourceSubjects),
    db.select().from(semesterQps).where(eq(semesterQps.isPublished, true)).orderBy(asc(semesterQps.id)),
    db.select().from(iaPapers).where(eq(iaPapers.isPublished, true)).orderBy(asc(iaPapers.id)),
    db.select().from(importantLinks).where(eq(importantLinks.isActive, true)).orderBy(asc(importantLinks.displayOrder)),
  ]);

  const branchMap = new Map<number, Branch>();
  for (const b of allBranches) branchMap.set(b.id, b);

  const yearMap = new Map<number, Year>();
  for (const y of allYears) yearMap.set(y.id, y);

  const semMap = new Map<number, { sem: Semester; semNum: number; branch?: Branch }>();
  for (const s of allSemesters) {
    const semNum = extractSemesterNumber(s.name) || 0;
    const y = yearMap.get(s.yearId);
    const b = y ? branchMap.get(y.branchId) : undefined;
    semMap.set(s.id, { sem: s, semNum, branch: b });
  }

  // Build subject to resources map from both primary subjectId and multi-linked resource_subjects
  const resMap = new Map<number, Resource>();
  for (const r of allResources) resMap.set(r.id, r);

  const subjectToResourcesMap = new Map<number, Resource[]>();
  for (const r of allResources) {
    if (r.subjectId) {
      const list = subjectToResourcesMap.get(r.subjectId) || [];
      if (!list.some((item) => item.id === r.id)) list.push(r);
      subjectToResourcesMap.set(r.subjectId, list);
    }
  }

  for (const rs of allResourceSubjects) {
    const r = resMap.get(rs.resourceId);
    if (r) {
      const list = subjectToResourcesMap.get(rs.subjectId) || [];
      if (!list.some((item) => item.id === r.id)) list.push(r);
      subjectToResourcesMap.set(rs.subjectId, list);
    }
  }

  const enrichedSubjects: EnrichedSubject[] = allSubjects.map((s) => {
    const semInfo = semMap.get(s.semesterId);
    const sResources = subjectToResourcesMap.get(s.id) || [];
    return {
      ...s,
      semesterNum: semInfo ? semInfo.semNum : (extractSemesterNumber(s.name) || 0),
      semesterName: semInfo ? semInfo.sem.name : "Semester",
      branchId: semInfo?.branch ? semInfo.branch.id : null,
      branchShortName: semInfo?.branch?.shortName || "",
      branchName: semInfo?.branch?.name || "",
      verifiedResourcesCount: sResources.length,
      resources: sResources,
    };
  });

  catalogCache = {
    timestamp: now,
    branches: allBranches,
    years: allYears,
    semesters: allSemesters,
    subjects: enrichedSubjects,
    resources: allResources,
    semesterQps: allSemesterQps as unknown as SemesterQp[],
    iaPapers: allIaPapers as unknown as IaPaper[],
    quickLinks: allQuickLinks,
  };

  return catalogCache;
}

// ============================================================================
// 4. NATURAL LANGUAGE CONTEXT EXTRACTORS & TOPIC HELPERS
// ============================================================================
function parseRoman(str: string): number | null {
  const map: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };
  return map[str.toLowerCase()] || null;
}

function parseSemToken(tok: string): number | null {
  const t = tok.toLowerCase();
  const r = parseRoman(t);
  if (r) return r;
  const d = t.match(/([1-8])/);
  return d ? parseInt(d[1], 10) : null;
}

function extractSemesterNumber(text: string): number | null {
  const norm = text.toLowerCase();
  if (norm.includes("c cycle") || norm.includes("c-cycle") || norm.includes("chem")) return 1;
  if (norm.includes("p cycle") || norm.includes("p-cycle") || norm.includes("phy")) return 2;

  // Check for negation: e.g. "not 4th, 3rd sem" or "meant 3rd, not 4th"
  const notMatch = norm.match(/\bnot\s+(?:sem|semester\s*)?([1-8]|(?:1st|2nd|3rd|[4-8]th)|i{1,3}|iv|v|vi{0,3}|viii)\b/);
  const negatedNum = notMatch ? parseSemToken(notMatch[1]) : null;

  // 1. Roman numerals with sem/semester: "sem iii", "semester iv", "sem-iii"
  const romanMatch = norm.match(/\b(?:sem|semester|s)[-\s]*(i{1,3}|iv|v|vi{0,3}|viii)\b/i);
  if (romanMatch) {
    const val = parseRoman(romanMatch[1]);
    if (val && val !== negatedNum) return val;
  }

  // 2. "sem-3", "sem 3", "semester-3", "sem 3rd", "semester 4th", "sem3"
  const m1 = norm.match(/\b(?:sem|semester|s)[-\s]*([1-8])\s*(?:st|nd|rd|th)?\b/);
  if (m1) {
    const val = parseInt(m1[1], 10);
    if (val !== negatedNum) return val;
  }

  // 3. "3 rd sem", "3rd sem", "3 sem", "3rd semester", "3 rd semester"
  const m2 = norm.match(/\b([1-8])\s*(?:st|nd|rd|th)?\s*(?:sem|semester)\b/);
  if (m2) {
    const val = parseInt(m2[1], 10);
    if (val !== negatedNum) return val;
  }

  // 4. Word-based ordinals with sem/semester: "third sem", "third semester", "fourth sem"
  const wordMatch = norm.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\s*(?:sem|semester)\b/);
  if (wordMatch) {
    const map: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8 };
    const val = map[wordMatch[1]];
    if (val && val !== negatedNum) return val;
  }

  // 5. Standalone ordinals: "3rd", "3 rd", "third", "fourth"
  if (/\b(?:1\s*st|first)\b/.test(norm) && negatedNum !== 1) return 1;
  if (/\b(?:2\s*nd|second)\b/.test(norm) && negatedNum !== 2) return 2;
  if (/\b(?:3\s*rd|third)\b/.test(norm) && negatedNum !== 3) return 3;
  if (/\b(?:4\s*th|fourth)\b/.test(norm) && negatedNum !== 4) return 4;
  if (/\b(?:5\s*th|fifth)\b/.test(norm) && negatedNum !== 5) return 5;
  if (/\b(?:6\s*th|sixth)\b/.test(norm) && negatedNum !== 6) return 6;
  if (/\b(?:7\s*th|seventh)\b/.test(norm) && negatedNum !== 7) return 7;
  if (/\b(?:8\s*th|eighth)\b/.test(norm) && negatedNum !== 8) return 8;

  const digit = norm.match(/^\s*([1-8])\s*$/);
  if (digit) return parseInt(digit[1], 10);

  return null;
}

function extractBranchName(text: string): string | null {
  const norm = text.toLowerCase();
  if (/\b(?:cse|computer\s*science|comp\s*sci)\b/.test(norm) || /\bcs\b/.test(norm)) return "CSE";
  if (/\b(?:aiml|ai\s*[\/&]?\s*ml|artificial\s*intelligence)\b/.test(norm)) return "AIML";
  if (/\b(?:ise|information\s*science|info\s*sci)\b/.test(norm)) return "ISE";
  if (/\b(?:ece|electronics(?:\s*and\s*communication)?)\b/.test(norm) || /\bec\b/.test(norm)) return "ECE";
  if (/\b(?:eee|electrical(?:\s*and\s*electronics)?)\b/.test(norm) || /\bee\b/.test(norm)) return "EEE";
  if (/\b(?:mech|mechanical(?:\s*engineering)?)\b/.test(norm)) return "MECH";
  if (/\b(?:civil(?:\s*engineering)?|cv)\b/.test(norm)) return "CIVIL";
  if (/\b(?:data\s*science)\b/.test(norm)) return "DS";
  return null;
}

type RequestedResourceType = "notes" | "syllabus" | "textbook" | "lab_manual" | "assignment" | "any";

function detectRequestedResourceType(normQuery: string, words: string[]): RequestedResourceType {
  if (normQuery.includes("syllabus") || normQuery.includes("curriculum")) return "syllabus";
  if (normQuery.includes("textbook") || words.includes("book") || words.includes("books") || normQuery.includes("reference book")) return "textbook";
  if (normQuery.includes("lab") || normQuery.includes("manual") || normQuery.includes("practical") || normQuery.includes("record")) return "lab_manual";
  if (normQuery.includes("assignment") || normQuery.includes("assignments")) return "assignment";
  if (normQuery.includes("note") || normQuery.includes("notes") || normQuery.includes("module")) return "notes";
  return "any";
}

function filterAndRankResources(
  resources: Resource[],
  requestedType: RequestedResourceType
): { filtered: Resource[]; typeMatched: boolean } {
  if (resources.length === 0) return { filtered: [], typeMatched: false };

  if (requestedType === "syllabus") {
    const matches = resources.filter(
      (r) => r.resourceType === "Reference" && r.title.toLowerCase().includes("syllabus")
    );
    if (matches.length > 0) return { filtered: matches, typeMatched: true };
    const titleMatches = resources.filter((r) => r.title.toLowerCase().includes("syllabus"));
    if (titleMatches.length > 0) return { filtered: titleMatches, typeMatched: true };
    return { filtered: resources, typeMatched: false };
  }

  if (requestedType === "textbook") {
    const matches = resources.filter(
      (r) =>
        r.title.toLowerCase().includes("textbook") ||
        r.title.toLowerCase().includes("book") ||
        r.resourceType === "Reference"
    );
    if (matches.length > 0) return { filtered: matches, typeMatched: true };
    return { filtered: resources, typeMatched: false };
  }

  if (requestedType === "lab_manual") {
    const matches = resources.filter(
      (r) => r.resourceType === "Lab manual" || r.title.toLowerCase().includes("lab") || r.title.toLowerCase().includes("manual")
    );
    if (matches.length > 0) return { filtered: matches, typeMatched: true };
    return { filtered: resources, typeMatched: false };
  }

  if (requestedType === "assignment") {
    const matches = resources.filter(
      (r) => r.resourceType === "Assignment" || r.title.toLowerCase().includes("assignment")
    );
    if (matches.length > 0) return { filtered: matches, typeMatched: true };
    return { filtered: resources, typeMatched: false };
  }

  if (requestedType === "notes") {
    const matches = resources.filter(
      (r) => r.resourceType === "Lecture notes" || r.title.toLowerCase().includes("notes") || r.title.toLowerCase().includes("mod")
    );
    if (matches.length > 0) return { filtered: matches, typeMatched: true };
    return { filtered: resources, typeMatched: false };
  }

  return { filtered: resources, typeMatched: false };
}

function detectSubjectTopic(normQuery: string, words: string[]): string | null {
  if (
    normQuery.includes("math") ||
    words.includes("m1") ||
    words.includes("m2") ||
    words.includes("m3") ||
    words.includes("m4") ||
    normQuery.includes("calculus") ||
    normQuery.includes("algebra")
  ) {
    return "math";
  }
  if (
    words.includes("dsa") ||
    normQuery.includes("data structure") ||
    normQuery.includes("data structures")
  ) {
    return "dsa";
  }
  if (
    normQuery.includes("ddco") ||
    normQuery.includes("dsdco") ||
    normQuery.includes("digital design") ||
    normQuery.includes("computer organization")
  ) {
    return "ddco";
  }
  if (
    words.includes("java") ||
    normQuery.includes("oops java") ||
    normQuery.includes("object oriented")
  ) {
    return "java";
  }
  if (
    words.includes("os") ||
    normQuery.includes("operating system") ||
    normQuery.includes("operating systems")
  ) {
    return "os";
  }
  if (words.includes("dbms") || normQuery.includes("database")) return "dbms";
  if (words.includes("cn") || normQuery.includes("computer network") || normQuery.includes("networking")) return "networks";
  if (normQuery.includes("microcontroller") || normQuery.includes("microprocessor") || normQuery.includes("mpmc")) return "microcontroller";
  if (normQuery.includes("python")) return "python";
  if (normQuery.includes("cloud")) return "cloud";
  if (normQuery.includes("iot") || normQuery.includes("internet of things")) return "iot";
  if (normQuery.includes("ai") || normQuery.includes("artificial intelligence") || normQuery.includes("machine learning") || words.includes("ml")) return "ai";
  if (normQuery.includes("physics") || normQuery.includes("phy")) return "physics";
  if (normQuery.includes("chemistry") || normQuery.includes("chem")) return "chemistry";
  if (normQuery.includes("biology")) return "biology";
  if (normQuery.includes("constitution") || normQuery.includes("cip")) return "constitution";
  return null;
}

function subjectMatchesTopic(s: EnrichedSubject, topic: string): boolean {
  const sName = s.name.toLowerCase();
  switch (topic) {
    case "math":
      return sName.includes("math") || sName.includes("calculus") || sName.includes("algebra");
    case "dsa":
      return sName.includes("data structure") || sName.includes("dsa");
    case "ddco":
      return sName.includes("digital design") || sName.includes("ddco") || sName.includes("dsdco") || sName.includes("computer organization");
    case "java":
      return sName.includes("java");
    case "os":
      return sName.includes("operating system");
    case "dbms":
      return sName.includes("database") || sName.includes("dbms");
    case "networks":
      return sName.includes("network");
    case "microcontroller":
      return sName.includes("microcontroller") || sName.includes("microprocessor") || sName.includes("mpmc");
    case "python":
      return sName.includes("python");
    case "cloud":
      return sName.includes("cloud");
    case "iot":
      return sName.includes("internet of things") || sName.includes("iot");
    case "ai":
      return sName.includes("artificial intelligence") || sName.includes("machine learning") || sName.includes("neural");
    case "physics":
      return sName.includes("physics");
    case "chemistry":
      return sName.includes("chemistry");
    case "biology":
      return sName.includes("biology");
    case "constitution":
      return sName.includes("constitution") || sName.includes("cip");
    default:
      return sName.includes(topic);
  }
}

function formatTopicName(topic: string): string {
  switch (topic) {
    case "math":
      return "Mathematics";
    case "dsa":
      return "Data Structures & Applications";
    case "ddco":
      return "Digital Design & Computer Organization";
    case "java":
      return "Object-Oriented Programming with Java";
    case "os":
      return "Operating Systems";
    case "dbms":
      return "Database Management Systems";
    case "networks":
      return "Computer Networks";
    case "microcontroller":
      return "Microcontrollers";
    case "python":
      return "Python Programming";
    case "cloud":
      return "Cloud Computing";
    case "iot":
      return "Internet of Things";
    case "ai":
      return "Artificial Intelligence & Machine Learning";
    case "physics":
      return "Engineering Physics";
    case "chemistry":
      return "Engineering Chemistry";
    default:
      return topic.charAt(0).toUpperCase() + topic.slice(1);
  }
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
  {
    id: "dsa_stacks_queues",
    keywords: ["stack", "queue", "lifo", "fifo", "stack vs queue", "push pop"],
    title: "Data Structures: Stack vs Queue",
    explanation:
      "**Stack (LIFO — Last In First Out):**\n" +
      "- Insertion and deletion occur only at one end called the **Top**.\n" +
      "- Operations: `push(x)` ($O(1)$), `pop()` ($O(1)$), `peek()` ($O(1)$).\n" +
      "- Applications: Function call stack, undo/redo mechanisms, backtracking, parenthesis matching.\n\n" +
      "**Queue (FIFO — First In First Out):**\n" +
      "- Insertion happens at the **Rear** and deletion happens at the **Front**.\n" +
      "- Operations: `enqueue(x)` ($O(1)$), `dequeue()` ($O(1)$).\n" +
      "- Applications: CPU task scheduling, print spooling, Breadth-First Search (BFS) graph traversal.",
    codeSnippet: {
      language: "java",
      code: `// Stack & Queue Demonstrator in Java
import java.util.Stack;
import java.util.LinkedList;
import java.util.Queue;

public class StackQueueDemo {
    public static void main(String[] args) {
        // Stack: LIFO
        Stack<Integer> stack = new Stack<>();
        stack.push(10);
        stack.push(20);
        System.out.println("Stack Pop (LIFO): " + stack.pop()); // 20

        // Queue: FIFO
        Queue<Integer> queue = new LinkedList<>();
        queue.add(10);
        queue.add(20);
        System.out.println("Queue Poll (FIFO): " + queue.poll()); // 10
    }
}`,
    },
    examTips:
      "💡 **Exam Tip:** Clearly illustrate the pointer positions (`Top` for Stack; `Front` and `Rear` for Queue). On circular queue questions, write the modulo increment formulas: `front = (front + 1) % SIZE` and `rear = (rear + 1) % SIZE`.",
    practiceQuestion:
      "**Practice Challenge:** Implement a Queue using two Stacks such that `dequeue()` has an amortized time complexity of $O(1)$.",
  },
  {
    id: "dsa_quicksort",
    keywords: ["quicksort", "quick sort", "pivot", "partition algorithm"],
    title: "Algorithms: QuickSort & Complexity Analysis",
    explanation:
      "**QuickSort** is a Divide-and-Conquer sorting algorithm that selects a **pivot element** and partitions the array such that all elements smaller than the pivot are placed to its left, and all larger elements are placed to its right.\n\n" +
      "**Time Complexity Analysis:**\n" +
      "- **Best Case: $O(n \\log n)$** — Occurs when the pivot consistently divides the array into two equal halves.\n" +
      "- **Average Case: $O(n \\log n)$** — Standard random distribution of elements.\n" +
      "- **Worst Case: $O(n^2)$** — Occurs when the array is already sorted (ascending or descending) and the first or last element is chosen as the pivot, producing $n$ unbalanced partitions ($0$ and $n-1$).",
    codeSnippet: {
      language: "java",
      code: `// Partition Step in Java (Lomuto Partition)
public static int partition(int[] arr, int low, int high) {
    int pivot = arr[high]; // Pick last element as pivot
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            int temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
        }
    }
    int temp = arr[i + 1]; arr[i + 1] = arr[high]; arr[high] = temp;
    return i + 1;
}`,
    },
    examTips:
      "💡 **Exam Tip:** To avoid the $O(n^2)$ worst case in practical engineering, explain **Randomized Pivot Selection** or the **Median-of-Three** technique.",
    practiceQuestion:
      "**Practice Question:** Trace QuickSort on the array `[50, 30, 10, 90, 70]` using the first element as the pivot, showing the array state after each recursive call.",
  },
  {
    id: "dsa_binary_search",
    keywords: ["binary search", "binary search time complexity", "log n"],
    title: "Algorithms: Binary Search & Logarithmic Complexity",
    explanation:
      "**Binary Search** is an optimal search algorithm for **sorted arrays** that repeatedly divides the search interval in half.\n\n" +
      "**Recurrence Relation:**\n" +
      "$$T(n) = T(n/2) + O(1)$$\n\n" +
      "By Master Theorem (Case 2), the solution is **$O(\\log_2 n)$** time complexity.\n\n" +
      "- **Best Case:** $O(1)$ (target found at the middle index on first comparison).\n" +
      "- **Worst Case:** $O(\\log n)$ (target not present or at the ends).\n" +
      "- **Space Complexity:** $O(1)$ iterative, $O(\\log n)$ recursive auxiliary stack.",
    codeSnippet: {
      language: "java",
      code: `// Binary Search in Java (Iterative)
public static int binarySearch(int[] arr, int target) {
    int low = 0, high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2; // Prevents integer overflow
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1; // Not found
}`,
    },
    examTips:
      "💡 **Exam Tip:** Mention why `mid = low + (high - low) / 2` is preferred over `(low + high) / 2` to prevent potential 32-bit signed integer overflow in Java/C++.",
    practiceQuestion:
      "**Practice Problem:** Given a sorted rotated array `[4, 5, 6, 7, 0, 1, 2]`, how can Binary Search be modified to find a target in $O(\\log n)$ time?",
  },
  {
    id: "os_process_threads",
    keywords: ["process vs thread", "thread", "process and thread", "pcb", "tcb"],
    title: "Operating Systems: Process vs Thread",
    explanation:
      "**Process:** An instance of an executing program with its own dedicated memory address space (Text, Data, Heap, Stack).\n" +
      "- Heavyweight: Requires high context switching overhead.\n" +
      "- Managed via Process Control Block (PCB).\n" +
      "- Inter-Process Communication (IPC) requires OS system calls (Pipes, Sockets, Shared Memory).\n\n" +
      "**Thread:** A basic unit of CPU execution within a process (often called a lightweight process).\n" +
      "- Threads of the same process **share Code, Data, and Heap**, but each thread has its own **Stack, Program Counter (PC), and Registers**.\n" +
      "- Low context switching overhead.\n" +
      "- Managed via Thread Control Block (TCB).",
    examTips:
      "💡 **Exam Answer Tip:** In VTU/BITM semester exams, draw the comparative diagram showing multiple threads inside a single process address space sharing the Heap and Global Data, with separate private Stacks.",
    practiceQuestion:
      "**Practice Question:** Explain why thread context switching is significantly faster than process context switching in modern OS kernels.",
  },
  {
    id: "os_cpu_scheduling",
    keywords: ["cpu scheduling", "round robin", "sjf", "fcfs", "turnaround time", "waiting time"],
    title: "Operating Systems: CPU Scheduling Algorithms",
    explanation:
      "**CPU Scheduling** decides which ready process is allocated the CPU core to maximize CPU utilization and throughput while minimizing turnaround time and waiting time.\n\n" +
      "**Common Algorithms:**\n" +
      "1. **FCFS (First-Come First-Served):** Non-preemptive. Simple FIFO queue, but suffers from the **Convoy Effect** (short jobs wait behind large CPU bursts).\n" +
      "2. **SJF (Shortest Job First):** Optimal minimum average waiting time. Difficult to know burst time in advance. Preemptive version is **SRTF**.\n" +
      "3. **Round Robin (RR):** Preemptive scheduling using a fixed **Time Quantum ($q$)**. Fair, responsive, ideal for time-sharing systems. If $q$ is too small, context-switch overhead dominates; if $q$ is too large, it degenerates into FCFS.\n" +
      "4. **Priority Scheduling:** Preemptive or non-preemptive based on priority integer. Suffers from **Starvation** (solved by Aging).",
    examTips:
      "💡 **Exam Answer Tip:** On exam numericals, always draw the **Gantt Chart** from $t=0$, and calculate: Turnaround Time ($TAT = \\text{Completion} - \\text{Arrival}$) and Waiting Time ($WT = TAT - \\text{Burst}$).",
    practiceQuestion:
      "**Practice Problem:** For 3 processes $P_1(0, 5), P_2(1, 3), P_3(2, 8)$ with Time Quantum = 2ms, draw the Round Robin Gantt chart and compute the average waiting time.",
  },
  {
    id: "ddco_multiplexers",
    keywords: ["multiplexer", "mux", "data selector", "4:1 mux", "demultiplexer"],
    title: "Digital Design: Multiplexers (MUX) & Boolean Synthesis",
    explanation:
      "A **Multiplexer (MUX)**, or data selector, is a combinational circuit that selects binary information from one of $2^n$ input data lines and directs it to a single output line based on $n$ select lines.\n\n" +
      "**4-to-1 Multiplexer:**\n" +
      "- Inputs: $I_0, I_1, I_2, I_3$\n" +
      "- Select Lines: $S_1, S_0$\n" +
      "- Output Equation:\n" +
      "$$Y = \\overline{S_1}\\ \\overline{S_0} I_0 + \\overline{S_1} S_0 I_1 + S_1 \\overline{S_0} I_2 + S_1 S_0 I_3$$\n\n" +
      "Any Boolean function of $n$ variables can be synthesized using a $2^{n-1}$-to-1 MUX.",
    examTips:
      "💡 **Exam Tip:** When asked to implement a 3-variable logic function using a 4:1 MUX, set select lines to two variables ($A, B$) and connect the data inputs ($I_0..I_3$) to $0, 1, C,$ or $\\overline{C}$.",
    practiceQuestion:
      "**Practice Problem:** Implement the Boolean function $F(A,B,C) = \\Sigma m(1, 3, 5, 6)$ using an 8-to-1 Multiplexer and using a 4-to-1 Multiplexer.",
  },
  {
    id: "math_relations_functions",
    keywords: ["relation", "relations", "functions", "equivalence relation", "injective", "surjective", "bijective"],
    title: "Discrete Mathematics: Relations & Functions",
    explanation:
      "**Equivalence Relation:** A binary relation $R$ on a set $A$ is an equivalence relation if and only if it is:\n" +
      "1. **Reflexive:** $\\forall a \\in A, (a, a) \\in R$.\n" +
      "2. **Symmetric:** If $(a, b) \\in R$, then $(b, a) \\in R$.\n" +
      "3. **Transitive:** If $(a, b) \\in R$ and $(b, c) \\in R$, then $(a, c) \\in R$.\n\n" +
      "**Function Properties:**\n" +
      "- **Injective (One-to-One):** $f(a) = f(b) \\implies a = b$. Distinct domain elements have distinct images.\n" +
      "- **Surjective (Onto):** For every $y$ in the codomain, there exists $x$ in the domain such that $f(x) = y$ (Range = Codomain).\n" +
      "- **Bijective:** Both Injective and Surjective. A bijection has a unique inverse function $f^{-1}$.",
    examTips:
      "💡 **Exam Answer Tip:** For equivalence relations, always test all 3 properties sequentially. Mention that an equivalence relation partitions a set into mutually disjoint **Equivalence Classes**.",
    practiceQuestion:
      "**Practice Problem:** Let $R$ be a relation on $\\mathbb{Z}$ defined by $a R b \\iff a \\equiv b \\pmod 5$. Prove that $R$ is an equivalence relation and determine the equivalence classes.",
  },
  {
    id: "math_recurrence_relations",
    keywords: ["recurrence relation", "recurrence", "characteristic equation", "homogeneous recurrence"],
    title: "Engineering Mathematics: Solving Linear Recurrence Relations",
    explanation:
      "A linear homogeneous recurrence relation of degree 2 with constant coefficients has the form:\n" +
      "$$a_n = c_1 a_{n-1} + c_2 a_{n-2}$$\n\n" +
      "**Step-by-Step Solution Method:**\n" +
      "1. **Form the Characteristic Equation:** Substitute $a_n = r^n$, giving $r^2 - c_1 r - c_2 = 0$.\n" +
      "2. **Find Roots ($r_1, r_2$):**\n" +
      "   - Case 1 (Real & Distinct): $a_n = A(r_1)^n + B(r_2)^n$\n" +
      "   - Case 2 (Real & Repeated $r_1 = r_2 = r$): $a_n = (A + Bn) r^n$\n" +
      "   - Case 3 (Complex Conjugate $r = \\rho e^{\\pm i\\theta}$): $a_n = \\rho^n (A\\cos n\\theta + B\\sin n\\theta)$\n" +
      "3. **Use Initial Conditions:** Solve for constants $A$ and $B$ using given values for $a_0$ and $a_1$.",
    examTips:
      "💡 **Exam Tip:** Check the question carefully for non-homogeneous terms (e.g. $+ 2^n$ or $+ n$). For non-homogeneous relations, the total solution is $a_n = a_n^{(h)} + a_n^{(p)}$ (Homogeneous + Particular solution).",
    practiceQuestion:
      "**Practice Problem:** Solve the recurrence relation $a_n - 7a_{n-1} + 12a_{n-2} = 0$ with initial conditions $a_0 = 2, a_1 = 7$.",
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
let cachedWorkingModel: string | null = null;
let lastAvailableModels = "";

async function getCandidateModels(geminiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey)}`, {
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      const list = (data?.models || []) as Array<{ name: string; supportedGenerationMethods?: string[] }>;
      const usable = list.filter((m) => m.supportedGenerationMethods?.includes("generateContent"));

      const namesList = usable.map((m) => m.name.replace(/^models\//, ""));
      lastAvailableModels = namesList.join(",");

      // Exclude models with known migration notices, TTS, or vision-only
      const active = namesList.filter((n) => !n.includes("2.5-flash") && !n.includes("tts") && !n.includes("image"));

      // Sort by preference: fast, responsive Flash models first
      const preferredOrder = [
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
        "gemini-2.5-flash-lite",
        "gemini-3-flash-preview",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-pro-latest",
        "gemini-2.5-pro",
        "gemma",
      ];

      active.sort((a, b) => {
        const idxA = preferredOrder.findIndex((p) => a.startsWith(p));
        const idxB = preferredOrder.findIndex((p) => b.startsWith(p));
        const rankA = idxA === -1 ? 999 : idxA;
        const rankB = idxB === -1 ? 999 : idxB;
        return rankA - rankB;
      });

      if (cachedWorkingModel && active.includes(cachedWorkingModel)) {
        return [cachedWorkingModel, ...active.filter((n) => n !== cachedWorkingModel)];
      }

      return active.length > 0 ? active : ["gemini-flash-latest", "gemini-flash-lite-latest"];
    }
  } catch (err) {
    logger.warn({ err }, "Model discovery check error");
  }

  return [cachedWorkingModel || "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"];
}

async function callExternalLlm(
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  systemContext: string
): Promise<{ text: string | null; status: string; errorDetail?: string }> {
  const rawKey = process.env["GEMINI_API_KEY"];
  const geminiKey = rawKey?.trim().replace(/^["']|["']$/g, "");
  if (!geminiKey) return { text: null, status: "missing_key" };

  // Build dialogue turns with strict alternating user/model roles required by Gemini API
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

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

  if (lastRole === "user" && contents.length > 0) {
    contents[contents.length - 1] = { role: "user", parts: [{ text: userMessage }] };
  } else {
    contents.push({ role: "user", parts: [{ text: userMessage }] });
  }

  const payloadBody = JSON.stringify({
    system_instruction: {
      parts: [{ text: systemContext }],
    },
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1000,
    },
  });

  const candidates = await getCandidateModels(geminiKey);
  let lastErrorReason = "unknown";
  let lastErrorMessage = "";

  // Try candidate models in order; if one returns 503 (high demand) or 404, gracefully try next
  for (const model of candidates.slice(0, 4)) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: payloadBody,
        signal: AbortSignal.timeout(6500),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === "string" && text.trim()) {
          cachedWorkingModel = model;
          return { text: text.trim(), status: "success" };
        }
      } else {
        const errBody = await res.text().catch(() => "");
        try {
          const parsed = JSON.parse(errBody);
          lastErrorMessage = (parsed?.error?.message || "").replace(/key=[^&\s]+/gi, "key=REDACTED");
        } catch {
          lastErrorMessage = `HTTP_${res.status}`;
        }
        lastErrorReason = `status_${res.status}`;

        logger.warn({ model, status: res.status, msg: lastErrorMessage }, "Candidate model non-200");

        // If 503 or 404, retry next candidate model
        if (res.status === 503 || res.status === 404) {
          continue;
        }
        break;
      }
    } catch (err: any) {
      lastErrorReason = "timeout_or_network";
      lastErrorMessage = err?.message || "fetch timeout";
      logger.warn({ model, err: lastErrorMessage }, "Candidate model fetch error");
      continue;
    }
  }

  return { text: null, status: `upstream_${lastErrorReason}`, errorDetail: lastErrorMessage };
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
  if (!rawQuery) {
    return res.status(400).json({
      error: "invalid_request",
      message: "Message cannot be empty or whitespace only.",
    });
  }
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

    // Detect subject topic and resource type
    const detectedTopic = detectSubjectTopic(normQuery, words);
    const requestedResourceType = detectRequestedResourceType(normQuery, words);

    // Differentiate between resource search queries vs academic conceptual explanations
    const isResourceIntent =
      normQuery.includes("note") ||
      normQuery.includes("notes") ||
      normQuery.includes("pdf") ||
      normQuery.includes("material") ||
      normQuery.includes("materials") ||
      normQuery.includes("study") ||
      normQuery.includes("syllabus") ||
      normQuery.includes("module") ||
      normQuery.includes("textbook") ||
      normQuery.includes("ppt") ||
      normQuery.includes("drive") ||
      normQuery.includes("link") ||
      normQuery.includes("shelf") ||
      normQuery.includes("resource") ||
      normQuery.includes("download") ||
      normQuery.includes("where can i") ||
      normQuery.includes("give me") ||
      normQuery.includes("i need") ||
      normQuery.includes("find") ||
      normQuery.includes("search");

    const isExplanationIntent =
      normQuery.includes("explain") ||
      normQuery.includes("what is") ||
      normQuery.includes("what are") ||
      normQuery.includes("how does") ||
      normQuery.includes("how to") ||
      normQuery.includes("difference between") ||
      normQuery.includes("compare") ||
      normQuery.includes("code for") ||
      normQuery.includes("write a program") ||
      normQuery.includes("program for") ||
      normQuery.includes("algorithm for");

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

        // If user also specified a topic, find the best matching subject in this semester
        const semTopicCandidates = detectedTopic
          ? catalog.subjects.filter((s) => s.semesterNum === activeSem && subjectMatchesTopic(s, detectedTopic))
          : [];
        semTopicCandidates.sort((a, b) => b.verifiedResourcesCount - a.verifiedResourcesCount);
        const semTopicSubject = semTopicCandidates[0];

        if (semTopicSubject) {
          activeSubject = semTopicSubject.name;
          activeSubjectId = semTopicSubject.id;
        }

        const directResources = matchedQps.slice(0, 4).map((q) => ({
          title: `${q.examYear ? q.examYear + " • " : ""}${q.title} (${q.department || "All"})`,
          url: q.downloadUrl,
          type: "End-Sem PYQ",
        }));

        const topicNotice = semTopicSubject ? ` (including **${semTopicSubject.name}**)` : "";

        const payload: ChatResponsePayload = {
          reply:
            matchedQps.length > 0
              ? `📝 Here are the **${semShort} Previous Year Question Papers (PYQs)** from BITM Autonomous Examinations${topicNotice}:`
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
            ...(semTopicSubject ? [{ label: `📐 ${semShort} ${formatTopicName(detectedTopic || "")} Notes`, value: `${semShort.toLowerCase()} ${detectedTopic} notes` }] : []),
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
    // CONVERSATION FLOW B: Changing Semester while retaining conversation context
    // E.g. Previous turn asked for DSA (3rd sem), now user says "What about 4th semester?"
    // ------------------------------------------------------------------------
    const isSemesterShiftQuery =
      activeSem !== null &&
      !detectedTopic &&
      Boolean(contextState?.subject) &&
      Boolean(contextState?.semester) &&
      extractSemesterNumber(contextState!.semester!) !== activeSem;

    if (isSemesterShiftQuery) {
      const prevSubject = contextState!.subject!;
      const prevSemNum = extractSemesterNumber(contextState!.semester!);

      const existsInNewSem = catalog.subjects.some(
        (s) =>
          s.semesterNum === activeSem &&
          (s.name.toLowerCase() === prevSubject.toLowerCase() ||
            s.name.toLowerCase().includes(prevSubject.toLowerCase()))
      );

      if (!existsInNewSem) {
        const newSemSubjects = catalog.subjects.filter(
          (s) =>
            s.semesterNum === activeSem &&
            (activeBranch ? s.branchShortName.toLowerCase() === activeBranch.toLowerCase() : true)
        );
        const uniqueSubjNames = [...new Set(newSemSubjects.map((s) => s.name))].slice(0, 4);
        const semShort = semNumToLabel(activeSem!);
        const semFull = semNumToFullLabel(activeSem!);
        const branchStr = activeBranch ? ` (${activeBranch})` : "";

        const payload: ChatResponsePayload = {
          reply: `🔍 **${prevSubject}** is a **${prevSemNum ? semNumToLabel(prevSemNum) : "previous semester"}** course. It is not taught in **${semFull}**.\n\nIn **${semFull}**${branchStr}, core subjects include:\n${uniqueSubjNames.map((n) => `• **${n}**`).join("\n")}\n\nWould you like study notes or question papers for any of these subjects?`,
          actionCard: {
            type: "subject",
            title: `${semFull} Subjects`,
            subtitle: `${newSemSubjects.length} subjects available${branchStr} • Autonomous Scheme`,
            badge: semShort,
            targetUrl: `/pyqs?tab=semester&semester=${encodeURIComponent(semFull)}`,
            buttonText: `Browse ${semShort} Subjects ➔`,
          },
          quickReplies: [
            ...uniqueSubjNames.slice(0, 3).map((name) => ({
              label: `${semShort} ${name.slice(0, 18)}`,
              value: `${semShort.toLowerCase()} ${name.toLowerCase()} notes`,
            })),
            { label: `📄 ${semShort} PYQs`, value: `${semShort.toLowerCase()} pyq` },
          ],
          updatedContextState: {
            semester: semFull,
            branch: activeBranch || contextState?.branch,
            subject: undefined,
            subjectId: undefined,
          },
          source: "catalog_search",
        };
        return res.json(payload);
      }
    }

    // ------------------------------------------------------------------------
    // ROUTE 4: Subject Notes & Resource Lookup (Strict Semester Constraints)
    // ------------------------------------------------------------------------
    // Do not intercept if user is clearly asking for a conceptual explanation (handled by LLM/Academic Engine)
    if (!(isExplanationIntent && !isResourceIntent)) {
      let matchingSubjects: EnrichedSubject[] = [];

      if (detectedTopic) {
        matchingSubjects = catalog.subjects.filter((s) => subjectMatchesTopic(s, detectedTopic));
      } else {
        // Direct matching of subject name in query
        matchingSubjects = catalog.subjects.filter((s) => {
          const sName = s.name.toLowerCase();
          return sName.length > 3 && (normQuery.includes(sName) || sName.includes(normQuery));
        });
      }

      // Fallback to activeSubject from conversation context if student asks for notes, syllabus, textbook, etc.
      if (matchingSubjects.length === 0 && activeSubject && (isResourceIntent || requestedResourceType !== "any")) {
        matchingSubjects = catalog.subjects.filter((s) => s.name.toLowerCase() === activeSubject!.toLowerCase());
      }

      if (matchingSubjects.length > 0) {
        // CASE 4A: User explicitly specified a semester (Strict Constraint)
        if (activeSem !== null) {
          const semCandidates = matchingSubjects.filter((s) => s.semesterNum === activeSem);

          if (semCandidates.length > 0) {
            // Rank: prioritize requested branch, then highest verified resources count
            let selectedSubject: EnrichedSubject | null = null;
            if (activeBranch) {
              const branchMatches = semCandidates.filter(
                (s) =>
                  s.branchShortName.toLowerCase() === activeBranch!.toLowerCase() ||
                  s.branchName.toLowerCase().includes(activeBranch!.toLowerCase())
              );
              if (branchMatches.length > 0) {
                branchMatches.sort((a, b) => b.verifiedResourcesCount - a.verifiedResourcesCount);
                selectedSubject = branchMatches[0];
              }
            }

            if (!selectedSubject) {
              semCandidates.sort((a, b) => b.verifiedResourcesCount - a.verifiedResourcesCount);
              selectedSubject = semCandidates[0];
            }

            const semLabel = selectedSubject.semesterName || semNumToLabel(selectedSubject.semesterNum);
            const branchLabel = selectedSubject.branchShortName ? ` • ${selectedSubject.branchShortName}` : "";

            // Check if subject exists but has 0 verified materials
            if (selectedSubject.resources.length === 0) {
              const payload: ChatResponsePayload = {
                reply: `📚 **${selectedSubject.name}** (${semLabel}${branchLabel}) is listed in our curriculum catalog, but no verified study notes or materials have been uploaded to Nexora yet.\n\nYou can still view the subject shelf or contribute materials if you have them:`,
                actionCard: {
                  type: "subject",
                  title: selectedSubject.name,
                  subtitle: `${semLabel}${branchLabel} • No notes uploaded yet`,
                  badge: semLabel,
                  targetUrl: `/subject/${selectedSubject.id}`,
                  buttonText: `Open ${selectedSubject.name.slice(0, 22)} Shelf ➔`,
                  resources: [],
                },
                quickReplies: [
                  { label: "📤 Contribute Notes", value: "how can i contribute notes" },
                  { label: `📄 ${semLabel} PYQs`, value: `${semLabel.toLowerCase()} pyq` },
                  { label: "🔍 Search another subject", value: "search another subject" },
                ],
                updatedContextState: {
                  semester: semLabel,
                  branch: selectedSubject.branchShortName || activeBranch || contextState?.branch,
                  subject: selectedSubject.name,
                  subjectId: selectedSubject.id,
                },
                source: "catalog_search",
              };
              return res.json(payload);
            }

            // Filter resources by requested type (notes, syllabus, textbook, lab manual, etc.)
            const rankResult = filterAndRankResources(selectedSubject.resources, requestedResourceType);
            const subjResources = rankResult.filtered;
            const typeMatched = rankResult.typeMatched;

            let replyIntro = `🎯 Found **${selectedSubject.name}** (${semLabel}${branchLabel}) in our library! There are **${selectedSubject.resources.length} verified notes & study resources** available.`;
            if (requestedResourceType === "syllabus" && typeMatched) {
              replyIntro = `📄 Here is the official syllabus for **${selectedSubject.name}** (${semLabel}${branchLabel}):`;
            } else if (requestedResourceType === "textbook" && typeMatched) {
              replyIntro = `📚 Here is the recommended textbook for **${selectedSubject.name}** (${semLabel}${branchLabel}):`;
            } else if (requestedResourceType === "lab_manual" && typeMatched) {
              replyIntro = `🔬 Here is the lab manual for **${selectedSubject.name}** (${semLabel}${branchLabel}):`;
            } else if (requestedResourceType === "assignment" && typeMatched) {
              replyIntro = `📝 Here are the assignments for **${selectedSubject.name}** (${semLabel}${branchLabel}):`;
            }

            const payload: ChatResponsePayload = {
              reply: replyIntro,
              actionCard: {
                type: "subject",
                title: selectedSubject.name,
                subtitle: `${semLabel}${branchLabel} • ${selectedSubject.resources.length} verified materials`,
                badge: semLabel,
                targetUrl: `/subject/${selectedSubject.id}`,
                buttonText: `🎯 Open ${selectedSubject.name.slice(0, 22)} Shelf ➔`,
                resources: subjResources.slice(0, 4).map((r) => ({
                  title: r.title,
                  url: r.googleDriveUrl,
                  type: r.resourceType || "Notes",
                })),
              },
              quickReplies: [
                { label: `📄 ${semLabel} PYQs`, value: `${semLabel.toLowerCase()} pyq` },
                { label: `📋 ${semLabel} IA Papers`, value: `${semLabel.toLowerCase()} ia papers` },
                { label: "🔍 Search another subject", value: "search another subject" },
              ],
              updatedContextState: {
                semester: semLabel,
                branch: selectedSubject.branchShortName || activeBranch || contextState?.branch,
                subject: selectedSubject.name,
                subjectId: selectedSubject.id,
              },
              source: "catalog_search",
            };
            return res.json(payload);
          } else {
            // Requested semester has NO matching subjects for this topic.
            // NEVER silently substitute another semester! List where it is available.
            const availableSems = [...new Set(matchingSubjects.map((s) => s.semesterNum))]
              .filter((n) => n > 0)
              .sort();

            const topicDisplay = detectedTopic ? formatTopicName(detectedTopic) : rawQuery;
            const requestedSemLabel = semNumToFullLabel(activeSem);

            if (availableSems.length > 0) {
              const payload: ChatResponsePayload = {
                reply: `🔍 We couldn't find any **${topicDisplay}** study notes for **${requestedSemLabel}** in our library.\n\nHowever, we have ${topicDisplay} study materials available for:\n${availableSems
                  .map((n) => `• **${semNumToFullLabel(n)}**`)
                  .join("\n")}\n\nWould you like to explore notes for one of these semesters instead?`,
                actionCard: {
                  type: "subject",
                  title: `${topicDisplay} Materials`,
                  subtitle: `Available in ${availableSems.map((n) => semNumToLabel(n)).join(", ")}`,
                  badge: "Other Semesters",
                  targetUrl: `/search?q=${encodeURIComponent(topicDisplay)}`,
                  buttonText: `Browse ${topicDisplay} in Library ➔`,
                },
                quickReplies: availableSems.slice(0, 4).map((n) => ({
                  label: `${semNumToLabel(n)} ${topicDisplay}`,
                  value: `${semNumToLabel(n).toLowerCase()} ${topicDisplay.toLowerCase()} notes`,
                })),
                updatedContextState: {
                  branch: activeBranch || contextState?.branch,
                  subject: undefined,
                  subjectId: undefined,
                },
                source: "catalog_search",
              };
              return res.json(payload);
            }
          }
        } else {
          // CASE 4B: No semester specified
          const availableSems = [...new Set(matchingSubjects.map((s) => s.semesterNum))]
            .filter((n) => n > 0)
            .sort();

          if (availableSems.length === 1) {
            // Subject is only taught in 1 semester
            const semCandidates = matchingSubjects.filter((s) => s.semesterNum === availableSems[0]);
            semCandidates.sort((a, b) => b.verifiedResourcesCount - a.verifiedResourcesCount);
            const selectedSubject = semCandidates[0];
            const semLabel = selectedSubject.semesterName || semNumToLabel(selectedSubject.semesterNum);
            const branchLabel = selectedSubject.branchShortName ? ` • ${selectedSubject.branchShortName}` : "";

            const rankResult = filterAndRankResources(selectedSubject.resources, requestedResourceType);
            const subjResources = rankResult.filtered;

            const payload: ChatResponsePayload = {
              reply: `🎯 Found **${selectedSubject.name}** in **${semLabel}**${branchLabel}!${
                selectedSubject.resources.length > 0
                  ? ` There are **${selectedSubject.resources.length} verified notes & study resources** available.`
                  : " You can explore this subject shelf below."
              }`,
              actionCard: {
                type: "subject",
                title: selectedSubject.name,
                subtitle: `${semLabel}${branchLabel} • ${selectedSubject.resources.length} verified materials`,
                badge: semLabel,
                targetUrl: `/subject/${selectedSubject.id}`,
                buttonText: `🎯 Open ${selectedSubject.name.slice(0, 22)} Shelf ➔`,
                resources: subjResources.slice(0, 4).map((r) => ({
                  title: r.title,
                  url: r.googleDriveUrl,
                  type: r.resourceType || "Notes",
                })),
              },
              quickReplies: [
                { label: `📄 ${semLabel} PYQs`, value: `${semLabel.toLowerCase()} pyq` },
                { label: `📋 ${semLabel} IA Papers`, value: `${semLabel.toLowerCase()} ia papers` },
                { label: "🔍 Search another subject", value: "search another subject" },
              ],
              updatedContextState: {
                semester: semLabel,
                branch: selectedSubject.branchShortName || activeBranch || contextState?.branch,
                subject: selectedSubject.name,
                subjectId: selectedSubject.id,
              },
              source: "catalog_search",
            };
            return res.json(payload);
          } else if (availableSems.length > 1) {
            const topicDisplay = detectedTopic ? formatTopicName(detectedTopic) : "This subject";
            const payload: ChatResponsePayload = {
              reply: `📚 **${topicDisplay}** is taught across multiple semesters at BITM.\n\nWhich semester do you need study notes for?`,
              actionCard: {
                type: "subject",
                title: `${topicDisplay} Study Materials`,
                subtitle: `Available across ${availableSems.map((n) => semNumToLabel(n)).join(", ")} • Autonomous Scheme`,
                badge: "Multiple Semesters",
                targetUrl: `/search?q=${encodeURIComponent(topicDisplay)}`,
                buttonText: `Browse All ${topicDisplay} Subjects ➔`,
              },
              quickReplies: availableSems.slice(0, 4).map((n) => ({
                label: `${semNumToLabel(n)} ${topicDisplay}`,
                value: `${semNumToLabel(n).toLowerCase()} ${topicDisplay.toLowerCase()} notes`,
              })),
              updatedContextState: {
                branch: activeBranch || contextState?.branch,
                subject: topicDisplay,
              },
              source: "catalog_search",
            };
            return res.json(payload);
          }
        }
      }
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

    const llmResult = await callExternalLlm(rawQuery, history, systemPrompt);
    res.setHeader("X-AI-Provider-Status", llmResult.status);
    if (lastAvailableModels) res.setHeader("X-AI-Available-Models", Buffer.from(lastAvailableModels.slice(0, 300)).toString("base64"));
    if (llmResult.errorDetail) res.setHeader("X-AI-Provider-Msg", Buffer.from(llmResult.errorDetail.slice(0, 200)).toString("base64"));
    const userMentionedPreviousSubject =
      Boolean(activeSubject) &&
      (normQuery.includes(activeSubject!.toLowerCase()) ||
        (detectedTopic ? subjectMatchesTopic({ name: activeSubject! } as any, detectedTopic) : false));

    const contextSubjectToRetain = userMentionedPreviousSubject ? activeSubject : undefined;
    const contextSubjectIdToRetain = userMentionedPreviousSubject ? activeSubjectId : undefined;
    const contextSemesterToRetain = activeSem ? semNumToFullLabel(activeSem) : (userMentionedPreviousSubject ? contextState?.semester : undefined);

    if (llmResult.text) {
      const payload: ChatResponsePayload = {
        reply: llmResult.text,
        quickReplies: [
          { label: "💡 Explain another concept", value: "explain another concept" },
          { label: "📐 Maths Notes", value: "i need maths notes" },
          { label: "💻 DSA Notes", value: "dsa notes" },
          { label: "⚡ DSDCO Notes", value: "dsdco notes" },
        ],
        updatedContextState: {
          semester: contextSemesterToRetain,
          branch: activeBranch || (userMentionedPreviousSubject ? contextState?.branch : undefined),
          subject: contextSubjectToRetain,
          subjectId: contextSubjectIdToRetain,
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
          { label: "💡 Explain another concept", value: "explain another concept" },
          { label: "📄 Find Related Notes", value: `${academicMatch.keywords[0]} notes` },
          { label: "📋 Practice PYQs", value: `${academicMatch.keywords[0]} pyq` },
        ],
        updatedContextState: {
          topic: academicMatch.id,
          semester: contextSemesterToRetain,
          branch: activeBranch || (userMentionedPreviousSubject ? contextState?.branch : undefined),
          subject: contextSubjectToRetain,
          subjectId: contextSubjectIdToRetain,
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
