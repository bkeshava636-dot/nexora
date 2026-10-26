import test from "node:test";
import assert from "node:assert/strict";

// Helper functions matching api-server logic
function parseRoman(str) {
  const map = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };
  return map[str.toLowerCase()] || null;
}

function parseSemToken(tok) {
  const t = tok.toLowerCase();
  const r = parseRoman(t);
  if (r) return r;
  const d = t.match(/([1-8])/);
  return d ? parseInt(d[1], 10) : null;
}

function extractSemesterNumber(text) {
  const norm = text.toLowerCase();
  if (norm.includes("c cycle") || norm.includes("c-cycle") || norm.includes("chem")) return 1;
  if (norm.includes("p cycle") || norm.includes("p-cycle") || norm.includes("phy")) return 2;

  const notMatch = norm.match(/\bnot\s+(?:sem|semester\s*)?([1-8]|(?:1st|2nd|3rd|[4-8]th)|i{1,3}|iv|v|vi{0,3}|viii)\b/);
  const negatedNum = notMatch ? parseSemToken(notMatch[1]) : null;

  const romanMatch = norm.match(/\b(?:sem|semester|s)[-\s]*(i{1,3}|iv|v|vi{0,3}|viii)\b/i);
  if (romanMatch) {
    const val = parseRoman(romanMatch[1]);
    if (val && val !== negatedNum) return val;
  }

  const m1 = norm.match(/\b(?:sem|semester|s)[-\s]*([1-8])\s*(?:st|nd|rd|th)?\b/);
  if (m1) {
    const val = parseInt(m1[1], 10);
    if (val !== negatedNum) return val;
  }

  const m2 = norm.match(/\b([1-8])\s*(?:st|nd|rd|th)?\s*(?:sem|semester)\b/);
  if (m2) {
    const val = parseInt(m2[1], 10);
    if (val !== negatedNum) return val;
  }

  const wordMatch = norm.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\s*(?:sem|semester)\b/);
  if (wordMatch) {
    const map = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8 };
    const val = map[wordMatch[1]];
    if (val && val !== negatedNum) return val;
  }

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

function extractBranchName(text) {
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

function detectRequestedResourceType(normQuery, words) {
  if (normQuery.includes("syllabus") || normQuery.includes("curriculum")) return "syllabus";
  if (normQuery.includes("textbook") || words.includes("book") || words.includes("books") || normQuery.includes("reference book")) return "textbook";
  if (normQuery.includes("lab") || normQuery.includes("manual") || normQuery.includes("practical") || normQuery.includes("record")) return "lab_manual";
  if (normQuery.includes("assignment") || normQuery.includes("assignments")) return "assignment";
  if (normQuery.includes("note") || normQuery.includes("notes") || normQuery.includes("module")) return "notes";
  return "any";
}

test("Phase 2 — Natural Language Understanding & Semester Extraction", async (t) => {
  await t.test("Spaced ordinals: '3 rd sem maths notes'", () => {
    assert.equal(extractSemesterNumber("3 rd sem maths notes"), 3);
  });

  await t.test("Standard ordinal: '3rd sem maths notes'", () => {
    assert.equal(extractSemesterNumber("3rd sem maths notes"), 3);
  });

  await t.test("Full word: '3rd semester mathematics notes'", () => {
    assert.equal(extractSemesterNumber("3rd semester mathematics notes"), 3);
  });

  await t.test("Inverted order: 'maths notes sem 3'", () => {
    assert.equal(extractSemesterNumber("maths notes sem 3"), 3);
  });

  await t.test("Short form: 'sem 3 maths'", () => {
    assert.equal(extractSemesterNumber("sem 3 maths"), 3);
  });

  await t.test("Word-based: 'mathematics for third semester'", () => {
    assert.equal(extractSemesterNumber("mathematics for third semester"), 3);
  });

  await t.test("Hyphenated: 'Maths notes pls sem-3'", () => {
    assert.equal(extractSemesterNumber("Maths notes pls sem-3"), 3);
  });

  await t.test("Roman numerals: 'sem III maths notes'", () => {
    assert.equal(extractSemesterNumber("sem III maths notes"), 3);
  });

  await t.test("Roman numerals 4th sem: 'sem IV notes'", () => {
    assert.equal(extractSemesterNumber("sem IV notes"), 4);
  });

  await t.test("Ordinals after sem: 'sem 3rd notes'", () => {
    assert.equal(extractSemesterNumber("sem 3rd notes"), 3);
  });

  await t.test("Cycles: 'c cycle notes'", () => {
    assert.equal(extractSemesterNumber("c cycle notes"), 1);
  });

  await t.test("Cycles: 'p cycle physics'", () => {
    assert.equal(extractSemesterNumber("p cycle physics"), 2);
  });

  await t.test("Negation / Correction: 'I meant 3rd semester, not 4th'", () => {
    assert.equal(extractSemesterNumber("I meant 3rd semester, not 4th"), 3);
  });

  await t.test("Negation / Correction: 'not 4th, 3rd semester'", () => {
    assert.equal(extractSemesterNumber("not 4th, 3rd semester"), 3);
  });

  await t.test("Module number not mistaken for semester: 'module 3 notes for sem 4'", () => {
    assert.equal(extractSemesterNumber("module 3 notes for sem 4"), 4);
  });
});

test("Phase 3 — Branch Extraction & Disambiguation", async (t) => {
  await t.test("CSE variations", () => {
    assert.equal(extractBranchName("CSE 3rd sem notes"), "CSE");
    assert.equal(extractBranchName("notes for computer science"), "CSE");
    assert.equal(extractBranchName("CS 3rd sem"), "CSE");
  });

  await t.test("AIML variations", () => {
    assert.equal(extractBranchName("AIML notes"), "AIML");
    assert.equal(extractBranchName("ai & ml 3rd sem"), "AIML");
    assert.equal(extractBranchName("artificial intelligence notes"), "AIML");
  });

  await t.test("ECE & EEE variations", () => {
    assert.equal(extractBranchName("ECE 4th sem"), "ECE");
    assert.equal(extractBranchName("EC 4th sem"), "ECE");
    assert.equal(extractBranchName("EEE 5th sem"), "EEE");
    assert.equal(extractBranchName("EE 5th sem"), "EEE");
  });

  await t.test("Civil & Mech variations", () => {
    assert.equal(extractBranchName("civil engineering notes"), "CIVIL");
    assert.equal(extractBranchName("mechanical notes"), "MECH");
    assert.equal(extractBranchName("mech 3rd sem"), "MECH");
  });

  await t.test("Word boundaries prevent false positives: 'physics notes'", () => {
    assert.equal(extractBranchName("physics notes"), null);
  });
});

test("Phase 4 — Resource Type Intent Recognition", async (t) => {
  await t.test("Syllabus intent", () => {
    assert.equal(detectRequestedResourceType("show me the syllabus too", ["show", "me", "the", "syllabus", "too"]), "syllabus");
  });

  await t.test("Textbook intent", () => {
    assert.equal(detectRequestedResourceType("dsa textbook pdf", ["dsa", "textbook", "pdf"]), "textbook");
    assert.equal(detectRequestedResourceType("reference book for maths", ["reference", "book", "for", "maths"]), "textbook");
  });

  await t.test("Lab manual intent", () => {
    assert.equal(detectRequestedResourceType("dsa lab manual", ["dsa", "lab", "manual"]), "lab_manual");
  });

  await t.test("Assignment intent", () => {
    assert.equal(detectRequestedResourceType("dsa assignment questions", ["dsa", "assignment", "questions"]), "assignment");
  });

  await t.test("Notes intent", () => {
    assert.equal(detectRequestedResourceType("maths notes", ["maths", "notes"]), "notes");
  });
});

test("Phase 8 — API Input Validation Rules", () => {
  function validateInput(msg) {
    if (typeof msg !== "string") return false;
    const trimmed = msg.trim();
    if (!trimmed || trimmed.length > 2000) return false;
    return true;
  }

  assert.equal(validateInput("hello"), true);
  assert.equal(validateInput(""), false);
  assert.equal(validateInput("   "), false);
  assert.equal(validateInput("\n\t  "), false);
  assert.equal(validateInput("a".repeat(2001)), false);
  assert.equal(validateInput("a".repeat(2000)), true);
});

test("Phase 5 — Multi-Turn Branch & Subject Continuity", async (t) => {
  function isBranchOnlyQuery(rawQuery, words, extractedBranch) {
    if (!extractedBranch) return false;
    const norm = rawQuery.toLowerCase().trim();
    if (norm.includes("pyq") || norm.includes("question") || norm.includes("explain") || norm.includes("what is")) {
      return false;
    }
    if (words.length <= 4) return true;
    if (norm.startsWith("for ") || norm.includes("instead") || norm.includes("branch") || norm.includes("switch to")) {
      return true;
    }
    return false;
  }

  await t.test("Branch-only queries detected correctly", () => {
    assert.equal(isBranchOnlyQuery("CSE", ["cse"], "CSE"), true);
    assert.equal(isBranchOnlyQuery("AIML", ["aiml"], "AIML"), true);
    assert.equal(isBranchOnlyQuery("for CSE", ["for", "cse"], "CSE"), true);
    assert.equal(isBranchOnlyQuery("for AIML instead", ["for", "aiml", "instead"], "AIML"), true);
    assert.equal(isBranchOnlyQuery("switch to ECE", ["switch", "to", "ece"], "ECE"), true);
  });

  await t.test("Non-branch or complex queries not treated as branch-only", () => {
    assert.equal(isBranchOnlyQuery("3rd sem mathematics notes", ["3rd", "sem", "mathematics", "notes"], null), false);
    assert.equal(isBranchOnlyQuery("CSE 3rd sem pyq", ["cse", "3rd", "sem", "pyq"], "CSE"), false);
    assert.equal(isBranchOnlyQuery("explain photosynthesis", ["explain", "photosynthesis"], null), false);
  });
});

test("Phase 4 & 5 — Keyword-based Resource Ranking", async (t) => {
  function filterAndRankResources(resources, requestedType, queryWords = []) {
    if (resources.length === 0) return { filtered: [], typeMatched: false };
    const stopWords = new Set([
      "show", "me", "the", "for", "and", "in", "a", "an", "of", "to", "notes",
      "note", "pls", "please", "can", "you", "give", "i", "need", "want", "find",
      "search", "material", "materials", "study", "pdf", "what", "is", "about", "all"
    ]);
    const contentWords = queryWords.map((w) => w.toLowerCase()).filter((w) => w.length > 2 && !stopWords.has(w));

    if (contentWords.length > 0) {
      const scored = resources.map((r) => {
        const titleLower = r.title.toLowerCase();
        let score = 0;
        for (const cw of contentWords) {
          if (titleLower.includes(cw)) score += 2;
        }
        return { resource: r, score };
      });

      const hasMatch = scored.some((s) => s.score > 0);
      if (hasMatch) {
        scored.sort((a, b) => b.score - a.score);
        return {
          filtered: scored.map((s) => s.resource),
          typeMatched: true,
          matchedTitle: scored[0].resource.title,
        };
      }
    }

    return { filtered: resources, typeMatched: false };
  }

  const sampleResources = [
    { id: 1, title: "recurrence relation" },
    { id: 2, title: "MATHS SYLLABUS" },
    { id: 3, title: "GRAPH THEORY" },
    { id: 4, title: "RELATION AND FUNCTIONS" },
  ];

  await t.test("Query 'Show me the relation and functions notes' ranks RELATION AND FUNCTIONS first", () => {
    const res = filterAndRankResources(
      sampleResources,
      "notes",
      ["show", "me", "the", "relation", "and", "functions", "notes"]
    );
    assert.equal(res.filtered[0].title, "RELATION AND FUNCTIONS");
    assert.equal(res.matchedTitle, "RELATION AND FUNCTIONS");
  });

  await t.test("Query 'graph theory notes' ranks GRAPH THEORY first", () => {
    const res = filterAndRankResources(
      sampleResources,
      "notes",
      ["graph", "theory", "notes"]
    );
    assert.equal(res.filtered[0].title, "GRAPH THEORY");
  });
});

test("Phase 5 & 8 — Route Destination Validity", async (t) => {
  const validAppRoutes = ["/", "/resources", "/search", "/pyqs", "/quick-links", "/branch/:id", "/subject/:id", "/contribute"];

  function isValidNavigation(targetUrl) {
    const path = targetUrl.split("?")[0];
    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) return true;
    if (path.startsWith("/subject/") && /^\/subject\/\d+$/.test(path)) return true;
    if (path.startsWith("/branch/") && /^\/branch\/\d+$/.test(path)) return true;
    return validAppRoutes.includes(path);
  }

  await t.test("Valid application routes pass", () => {
    assert.equal(isValidNavigation("/resources?query=Mathematics"), true);
    assert.equal(isValidNavigation("/resources?query=Mathematics&semester=SEM%203"), true);
    assert.equal(isValidNavigation("/subject/69"), true);
    assert.equal(isValidNavigation("/subject/172"), true);
    assert.equal(isValidNavigation("/pyqs?tab=semester&semester=3rd%20Semester"), true);
    assert.equal(isValidNavigation("/pyqs?tab=ia"), true);
  });

  await t.test("Invalid or empty routes fail", () => {
    assert.equal(isValidNavigation(""), false);
    assert.equal(isValidNavigation("/nonexistent-page"), false);
    assert.equal(isValidNavigation("/subject/invalid-id"), false);
  });
});
