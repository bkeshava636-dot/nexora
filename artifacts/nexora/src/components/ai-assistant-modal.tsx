import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Bot,
  X,
  Send,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileText,
  Minimize2,
  Maximize2,
  Upload,
  Link2,
  GraduationCap,
} from "lucide-react";
import {
  useListSubjects,
  useListSemesters,
  useListYears,
  useListBranches,
  useListResources,
  useListQuickLinks,
  type Subject,
  type Resource,
} from "@workspace/api-client-react";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  quickReplies?: { label: string; value: string }[];
  actionCard?: {
    type: "subject" | "pyqs" | "link" | "contribute" | "resources";
    title: string;
    subtitle?: string;
    badge?: string;
    targetUrl: string;
    external?: boolean;
    buttonText: string;
    resources?: { title: string; url?: string; type: string }[];
  };
}

interface SubjectTopic {
  key: string;
  name: string;
  acronyms: string[];
  phrases: string[];
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[a.length][b.length];
}

const TOPICS: SubjectTopic[] = [
  {
    key: "ddco",
    name: "Digital Design and Computer Organization",
    acronyms: ["ddco", "dsdco", "dsd", "dld", "ade", "coa"],
    phrases: [
      "digital design and computer organization",
      "digital design",
      "computer organization",
      "digital system design",
      "digital logic design",
      "computer architecture",
    ],
  },
  {
    key: "dsa",
    name: "Data Structures and Applications",
    acronyms: ["dsa", "ds"],
    phrases: [
      "data structures and applications",
      "data structures",
      "data structure",
      "trees and graphs",
      "linked list",
    ],
  },
  {
    key: "os",
    name: "Operating Systems",
    acronyms: ["os"],
    phrases: ["operating systems", "operating system", "linux", "unix"],
  },
  {
    key: "maths",
    name: "Mathematics",
    acronyms: ["m1", "m2", "m3", "m4", "math", "maths"],
    phrases: [
      "mathematics",
      "applied mathematics",
      "transform calculus",
      "complex analysis",
      "numerical methods",
      "fourier series",
      "statistics and probability",
      "linear algebra",
      "discrete mathematics",
    ],
  },
  {
    key: "java",
    name: "Object Oriented Programming with Java",
    acronyms: ["java", "oops"],
    phrases: [
      "object oriented programming with java",
      "java programming",
      "object oriented programming",
      "oop java",
    ],
  },
  {
    key: "python",
    name: "Python Programming",
    acronyms: ["python"],
    phrases: ["python programming", "python language"],
  },
  {
    key: "physics",
    name: "Engineering Physics",
    acronyms: ["phy"],
    phrases: [
      "physics for ai",
      "engineering physics",
      "physics",
      "p-cycle physics",
      "p cycle physics",
      "quantum mechanics",
    ],
  },
  {
    key: "chemistry",
    name: "Applied Chemistry",
    acronyms: ["chem"],
    phrases: [
      "applied chemistry",
      "engineering chemistry",
      "chemistry",
      "c-cycle chemistry",
      "c cycle chemistry",
    ],
  },
  {
    key: "c_prog",
    name: "Programming in C",
    acronyms: ["cip", "cprog"],
    phrases: ["programming in c", "c programming", "c language"],
  },
  {
    key: "dbms",
    name: "Database Management Systems",
    acronyms: ["dbms", "sql", "rdbms"],
    phrases: [
      "database management systems",
      "database management",
      "database",
      "databases",
    ],
  },
  {
    key: "cn",
    name: "Computer Networks",
    acronyms: ["cn"],
    phrases: ["computer networks", "computer network", "networking"],
  },
  {
    key: "ai",
    name: "Introduction to AI and Applications",
    acronyms: ["ai", "aiml", "ml"],
    phrases: [
      "introduction to ai",
      "artificial intelligence",
      "machine learning",
      "deep learning",
    ],
  },
  {
    key: "biology",
    name: "Biology for Computer Engineers",
    acronyms: ["bio"],
    phrases: ["biology for computer engineers", "biology for engineers", "biology"],
  },
  {
    key: "kannada",
    name: "Samskritik / Balake Kannada",
    acronyms: ["kannada"],
    phrases: ["samskritik kannada", "balake kannada", "kannada"],
  },
  {
    key: "constitution",
    name: "Indian Constitution and Engineering Ethics",
    acronyms: ["constitution", "ethics"],
    phrases: [
      "indian constitution and engineering ethics",
      "constitution of india",
      "engineering ethics",
    ],
  },
  {
    key: "caed",
    name: "Computer Aided Engineering Drawing",
    acronyms: ["caed"],
    phrases: ["computer aided engineering drawing", "engineering drawing", "caed drawing"],
  },
];

function scoreTopic(inputWords: string[], rawNorm: string, topic: SubjectTopic): number {
  let score = 0;

  // 1. Exact acronym matching (word boundary match)
  for (const acr of topic.acronyms) {
    if (inputWords.includes(acr)) {
      score += 150;
    }
    // Fuzzy check on user words if user made a slight typo (e.g. dsdco -> ddco)
    for (const w of inputWords) {
      if (w.length >= 4 && acr.length >= 4 && levenshtein(w, acr) === 1) {
        score += 80;
      }
    }
  }

  // 2. Phrase matching
  for (const phr of topic.phrases) {
    if (rawNorm.includes(phr)) {
      score += phr.length * 6;
    }
  }

  // 3. Token & fuzzy matching against phrases
  for (const w of inputWords) {
    if (
      w.length < 3 ||
      ["notes", "note", "sem", "semester", "need", "give", "shelf", "subject", "exam", "book"].includes(w)
    ) {
      continue;
    }

    for (const phr of topic.phrases) {
      const phrWords = phr.split(/\s+/);
      if (phrWords.includes(w)) {
        score += w.length * 3;
      } else {
        for (const pw of phrWords) {
          if (w.length >= 5 && pw.length >= 5 && levenshtein(w, pw) <= 1) {
            score += 15;
          }
        }
      }
    }
  }

  return score;
}

function normalizeSemName(semName?: string): { num: number; label: string } {
  if (!semName) return { num: 1, label: "1st Sem" };
  const upper = semName.toUpperCase();
  if (upper.includes("C-CYCLE") || upper.includes("CHEM")) return { num: 1, label: "1st Sem (C-Cycle)" };
  if (upper.includes("P-CYCLE") || upper.includes("PHY")) return { num: 2, label: "2nd Sem (P-Cycle)" };
  const m = upper.match(/\b([1-8])\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    const suffixes = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
    return { num: n, label: `${suffixes[n] || n + "th"} Sem` };
  }
  return { num: 1, label: semName };
}

function extractSemesterFromText(rawText: string): number | null {
  const norm = rawText.toLowerCase();

  if (norm.includes("c cycle") || norm.includes("c-cycle") || norm.includes("chem cycle") || norm.includes("chemistry cycle")) {
    return 1;
  }
  if (norm.includes("p cycle") || norm.includes("p-cycle") || norm.includes("phy cycle") || norm.includes("physics cycle")) {
    return 2;
  }

  const semMatch =
    norm.match(/\b(?:sem|semester|s)\s*([1-8])\b/) ||
    norm.match(/\b([1-8])(?:st|nd|rd|th)?\s*(?:sem|semester)\b/) ||
    norm.match(/\bsem([1-8])\b/) ||
    norm.match(/\bs([1-8])\b/);
  if (semMatch) {
    return parseInt(semMatch[1], 10);
  }

  if (norm.includes("1st") || norm.includes("first")) return 1;
  if (norm.includes("2nd") || norm.includes("second")) return 2;
  if (norm.includes("3rd") || norm.includes("third")) return 3;
  if (norm.includes("4th") || norm.includes("fourth")) return 4;
  if (norm.includes("5th") || norm.includes("fifth")) return 5;
  if (norm.includes("6th") || norm.includes("sixth")) return 6;
  if (norm.includes("7th") || norm.includes("seventh")) return 7;
  if (norm.includes("8th") || norm.includes("eighth")) return 8;

  const singleDigit = norm.match(/^\s*([1-8])\s*$/);
  if (singleDigit) {
    return parseInt(singleDigit[1], 10);
  }

  return null;
}

export function AiAssistantModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [, setLocation] = useLocation();

  // Queries
  const { data: allSubjects = [] } = useListSubjects();
  const { data: allSemesters = [] } = useListSemesters();
  const { data: resources = [] } = useListResources();
  const { data: quickLinks = [] } = useListQuickLinks();

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Hi! I'm your **Nexora Study Assistant** for BITM.\n\nAsk me for notes, question papers, or links, for example:\n• *\"I need maths notes\"*\n• *\"DSDCO / DDCO notes\"*\n• *\"Data Structures notes\"*\n• *\"BITM results link\"*\n\nHow can I help you today?",
      timestamp: "Just now",
      quickReplies: [
        { label: "📐 Maths Notes", value: "i need maths notes" },
        { label: "⚡ DSDCO / DDCO Notes", value: "dsdco notes" },
        { label: "💻 Data Structures", value: "data structures notes" },
        { label: "📊 BITM Results Link", value: "bitm result link" },
      ],
    },
  ]);

  // Context memory for multi-turn conversations
  const [pendingClarification, setPendingClarification] = useState<{
    topicKey: string;
    topicName: string;
    options: Array<{ semNum: number; semLabel: string; subject: Subject; count: number }>;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  // Semesters lookup map
  const semMap = useMemo(() => {
    const map = new Map<number, { num: number; label: string; raw: string }>();
    allSemesters.forEach((s) => {
      map.set(s.id, { raw: s.name, ...normalizeSemName(s.name) });
    });
    return map;
  }, [allSemesters]);

  // Resources grouped by subject ID
  const resourcesBySubject = useMemo(() => {
    const map = new Map<number, Resource[]>();
    resources.forEach((r) => {
      const list = map.get(r.subjectId) || [];
      list.push(r);
      map.set(r.subjectId, list);
    });
    return map;
  }, [resources]);

  const handleSendMessage = (textToSend?: string) => {
    const userQuery = (textToSend ?? input).trim();
    if (!userQuery) return;

    const userMsgId = Date.now().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      processBotQuery(userQuery);
      setIsTyping(false);
    }, 380);
  };

  const processBotQuery = (rawQuery: string) => {
    const norm = rawQuery.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
    const words = norm.split(/\s+/);
    const extractedSem = extractSemesterFromText(rawQuery);

    // 1. Multi-turn Clarification Response
    if (pendingClarification) {
      const targetSem = extractedSem;
      if (targetSem !== null) {
        const matchedOpt =
          pendingClarification.options.find((opt) => opt.semNum === targetSem) ||
          pendingClarification.options[0];

        if (matchedOpt) {
          serveSubjectShelf(matchedOpt.subject, matchedOpt.semNum, matchedOpt.semLabel);
          setPendingClarification(null);
          return;
        }
      }
    }

    // 2. BITM Autonomous Results Intent (Strict priority over general links!)
    if (
      norm.includes("result") ||
      norm.includes("results") ||
      norm.includes("marks") ||
      norm.includes("sgpa") ||
      norm.includes("cgpa") ||
      norm.includes("grade") ||
      norm.includes("contineo")
    ) {
      const bitmResultsLink = quickLinks.find(
        (l) => l.url.includes("bitmeresults.contineo.in") || l.title.toLowerCase().includes("result")
      );
      const url = bitmResultsLink ? bitmResultsLink.url : "https://bitmeresults.contineo.in/";

      const responseMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "🎓 Here is the official **BITM Autonomous Examination Results Portal (Contineo)** link to check your semester results, SGPA, and grade sheets:",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
          { label: "🎒 Contineo Student Portal", value: "contineo student portal" },
          { label: "📐 Maths Notes", value: "i need maths notes" },
        ],
      };
      setMessages((prev) => [...prev, responseMsg]);
      return;
    }

    // 3. Official Academic Calendar / Portals Intent
    if (
      norm.includes("calendar") ||
      norm.includes("academic") ||
      norm.includes("portal") ||
      norm.includes("quick links")
    ) {
      const match = quickLinks.find(
        (l) =>
          l.title.toLowerCase().includes(norm) ||
          (l.description && l.description.toLowerCase().includes(norm)) ||
          l.category.toLowerCase().includes(norm)
      );
      const topLink = match || quickLinks[0];

      const responseMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: topLink
          ? `🔗 Here is the official link for **${topLink.title}**:`
          : "🔗 Here are the official BITM academic links and portals:",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionCard: {
          type: "link",
          title: topLink ? topLink.title : "Official Quick Links & Portals",
          subtitle: topLink ? (topLink.description ?? undefined) : "Academic portals, calendar & notifications",
          badge: "BITM Official",
          targetUrl: topLink ? topLink.url : "/quick-links",
          external: !!topLink,
          buttonText: topLink ? `Open ${topLink.title.slice(0, 20)} ↗` : "View All Quick Links ➔",
        },
        quickReplies: [
          { label: "📊 BITM Results", value: "bitm result link" },
          { label: "View All Quick Links", value: "quick links" },
        ],
      };
      setMessages((prev) => [...prev, responseMsg]);
      return;
    }

    // 4. PYQ Intent
    if (
      norm.includes("pyq") ||
      norm.includes("question paper") ||
      norm.includes("previous year") ||
      norm.includes("old paper") ||
      norm.includes("qp")
    ) {
      const semText = extractedSem ? `for **Semester ${extractedSem}**` : "for all departments and semesters";
      const responseMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: `📝 Looking for Previous Year Question Papers? We have BITM Autonomous End-Semester exam papers and Internal Assessment (IA) test archives ${semText}!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionCard: {
          type: "pyqs",
          title: extractedSem ? `Semester ${extractedSem} Question Papers` : "PYQ & Question Papers Archive",
          subtitle: "Autonomous End-Sem exam papers & mid-term IA papers",
          badge: extractedSem ? `Sem ${extractedSem} PYQs` : "Exam Prep",
          targetUrl: "/pyqs",
          buttonText: "Open PYQs Section ➔",
        },
        quickReplies: [
          { label: "📐 Maths PYQs", value: "maths pyq" },
          { label: "💻 CSE / AIML PYQs", value: "cse pyqs" },
          { label: "⚡ DSDCO / DDCO Notes", value: "dsdco notes" },
        ],
      };
      setMessages((prev) => [...prev, responseMsg]);
      return;
    }

    // 5. Contribute / Upload Intent
    if (
      norm.includes("upload") ||
      norm.includes("contribute") ||
      norm.includes("share notes") ||
      norm.includes("submit notes")
    ) {
      const responseMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "✨ Want to help fellow BITM students? You can upload your PDF notes (up to 25 MB or via Google Drive link) on our **Contribute** desk with zero storage costs!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionCard: {
          type: "contribute",
          title: "Contribute Study Material",
          subtitle: "Fast zero-storage direct Google Drive upload. Your name is credited!",
          badge: "Community Upload",
          targetUrl: "/contribute",
          buttonText: "Go to Contribute Page ➔",
        },
      };
      setMessages((prev) => [...prev, responseMsg]);
      return;
    }

    // 6. Token-scored Topic Matching (Solves DSDCO vs DSA collision!)
    const scoredTopics = TOPICS.map((topic) => ({
      topic,
      score: scoreTopic(words, norm, topic),
    })).sort((a, b) => b.score - a.score);

    const bestTopic = scoredTopics[0].score >= 50 ? scoredTopics[0].topic : null;

    let candidateSubjects: Subject[] = [];

    if (bestTopic) {
      candidateSubjects = allSubjects.filter((subj) => {
        const text = (subj.name + " " + (subj.description || "")).toLowerCase();
        // Check if any phrase or acronym matches this subject text
        return (
          bestTopic.phrases.some((p) => text.includes(p)) ||
          bestTopic.acronyms.some((a) => {
            const subjWords = text.replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
            return subjWords.includes(a);
          })
        );
      });
    } else {
      // General fuzzy search on subjects
      candidateSubjects = allSubjects.filter((subj) => {
        const text = (subj.name + " " + (subj.description || "")).toLowerCase();
        return text.includes(norm) || norm.includes(subj.name.toLowerCase());
      });
    }

    // Sort candidate subjects so that subjects with actual resources come first!
    candidateSubjects.sort((a, b) => {
      const countA = (resourcesBySubject.get(a.id) || []).length;
      const countB = (resourcesBySubject.get(b.id) || []).length;
      return countB - countA;
    });

    if (candidateSubjects.length === 0) {
      // Check if any resource titles match
      const matchingRes = resources.filter((r) => {
        const titleNorm = r.title.toLowerCase();
        return titleNorm.includes(norm) || (r.description && r.description.toLowerCase().includes(norm));
      });

      if (matchingRes.length > 0) {
        const res = matchingRes[0];
        const responseMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: `📄 Found resource: **${res.title}**!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionCard: {
            type: "resources",
            title: res.title,
            subtitle: res.description || "Study material in resource library",
            badge: res.resourceType || "Notes",
            targetUrl: `/resources?query=${encodeURIComponent(rawQuery)}`,
            buttonText: "Open in Resource Library ➔",
          },
        };
        setMessages((prev) => [...prev, responseMsg]);
        return;
      }

      // No matches found fallback
      const responseMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: `🤔 I couldn't find a direct match for *"${rawQuery}"*.\n\nTry searching by subject name (like *Maths*, *DSDCO / DDCO*, *Data Structures*, *Operating Systems*, *Java*) or browse our library:`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        quickReplies: [
          { label: "📐 Maths Notes", value: "i need maths notes" },
          { label: "⚡ DSDCO / DDCO Notes", value: "dsdco notes" },
          { label: "💻 Data Structures", value: "data structures notes" },
          { label: "📊 BITM Results Link", value: "bitm result link" },
        ],
      };
      setMessages((prev) => [...prev, responseMsg]);
      return;
    }

    // Group subjects by normalized semester number (1 to 8)
    const semMapOptions = new Map<number, { semNum: number; semLabel: string; subject: Subject; count: number }>();

    candidateSubjects.forEach((subj) => {
      const semInfo = semMap.get(subj.semesterId) || { num: 1, label: "1st Sem", raw: "" };
      const count = (resourcesBySubject.get(subj.id) || []).length;
      const current = semMapOptions.get(semInfo.num);

      if (!current || count > current.count) {
        semMapOptions.set(semInfo.num, {
          semNum: semInfo.num,
          semLabel: semInfo.label,
          subject: subj,
          count,
        });
      }
    });

    const semesterOptions = Array.from(semMapOptions.values()).sort((a, b) => a.semNum - b.semNum);

    // If user specified a semester in their query, or only 1 semester exists:
    if (extractedSem !== null || semesterOptions.length === 1) {
      const targetSem = extractedSem ?? semesterOptions[0].semNum;
      const matchedOption = semesterOptions.find((opt) => opt.semNum === targetSem) || semesterOptions[0];
      serveSubjectShelf(matchedOption.subject, matchedOption.semNum, matchedOption.semLabel);
      return;
    }

    // MULTIPLE SEMESTERS FOUND -> Ask clarifying question as requested!
    const topicTitle = bestTopic ? bestTopic.name : "this subject";

    // Set state for next response
    setPendingClarification({
      topicKey: bestTopic ? bestTopic.key : "general",
      topicName: topicTitle,
      options: semesterOptions,
    });

    const quickReplyButtons = semesterOptions.map((opt) => ({
      label: `${opt.semLabel} (${opt.subject.name.slice(0, 18)}${opt.subject.name.length > 18 ? "…" : ""}${
        opt.count > 0 ? ` • ${opt.count} notes` : ""
      })`,
      value: `sem ${opt.semNum}`,
    }));

    const responseMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: "bot",
      text: `📚 I found **${topicTitle}** across several semesters!\n\n**Which semester do you need notes for?** Click below or type your semester:`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      quickReplies: quickReplyButtons,
    };

    setMessages((prev) => [...prev, responseMsg]);
  };

  const serveSubjectShelf = (subject: Subject, semNum: number, semLabel: string) => {
    const subjResources = resourcesBySubject.get(subject.id) || [];

    const responseMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: "bot",
      text: `🎯 Here is the shelf for **${semLabel}: ${subject.name}**!${
        subjResources.length > 0
          ? ` There are **${subjResources.length} resources & notes** available.`
          : " Ready to view on your desk."
      }`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      actionCard: {
        type: "subject",
        title: subject.name,
        subtitle: `${semLabel} • ${subjResources.length} Materials available`,
        badge: semLabel,
        targetUrl: `/subject/${subject.id}`,
        buttonText: `🎯 Take me to ${subject.name.slice(0, 22)} Shelf ➔`,
        resources: subjResources.slice(0, 3).map((r) => ({
          title: r.title,
          url: r.googleDriveUrl,
          type: r.resourceType || "Notes",
        })),
      },
      quickReplies: [
        { label: `📄 See PYQs for ${semLabel}`, value: `pyqs for sem ${semNum}` },
        { label: "🔍 Search another subject", value: "search another subject" },
      ],
    };

    setMessages((prev) => [...prev, responseMsg]);
  };

  const handleActionNavigate = (targetUrl: string, external?: boolean) => {
    if (external) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } else {
      setLocation(targetUrl);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsMinimized(true);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className="focus-ring relative inline-flex items-center gap-2 rounded-full border border-[hsl(var(--secondary)/.4)] bg-gradient-to-r from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--secondary)/.15)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:border-[hsl(var(--secondary))] hover:shadow-2xl cursor-pointer active:scale-95 group"
        aria-label="Ask Nexora AI Assistant"
        data-testid="button-floating-ai-assistant"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-xs group-hover:rotate-6 transition-transform">
          <Bot size={15} strokeWidth={2.5} />
        </span>
        <span className="hidden sm:inline">Ask AI Assistant</span>
        <span className="sm:hidden">AI Bot</span>
      </button>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out ${
            isMinimized
              ? "bottom-5 right-20 w-72 h-14 rounded-2xl shadow-xl overflow-hidden"
              : "bottom-5 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] max-h-[85vh] rounded-3xl shadow-2xl flex flex-col"
          } border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] backdrop-blur-2xl`}
          role="dialog"
          aria-labelledby="ai-assistant-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-sm">
                <Bot size={17} strokeWidth={2.4} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[hsl(var(--card))] bg-emerald-500" />
              </div>
              <div>
                <h3 id="ai-assistant-title" className="text-xs font-bold leading-none tracking-tight flex items-center gap-1.5">
                  Nexora AI Assistant
                  <span className="rounded-md bg-[hsl(var(--secondary)/.18)] px-1.5 py-0.5 text-[9px] font-extrabold text-[hsl(var(--secondary))]">
                    BITM
                  </span>
                </h3>
                <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                  Instant notes & subject navigator
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setMessages([
                    {
                      id: "welcome-reset",
                      sender: "bot",
                      text: "Chat cleared! What subject or study material can I help you find?",
                      timestamp: "Just now",
                      quickReplies: [
                        { label: "📐 Maths Notes", value: "i need maths notes" },
                        { label: "⚡ DSDCO / DDCO Notes", value: "dsdco notes" },
                        { label: "💻 Data Structures", value: "data structures notes" },
                        { label: "📊 BITM Results Link", value: "bitm result link" },
                      ],
                    },
                  ]);
                  setPendingClarification(null);
                }}
                className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <RotateCcw size={14} />
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                title={isMinimized ? "Expand" : "Minimize"}
                aria-label={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                title="Close assistant"
                aria-label="Close assistant"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body when expanded */}
          {!isMinimized && (
            <>
              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 mobile-scroll text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-xs ${
                        msg.sender === "user"
                          ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-tr-xs"
                          : "bg-[hsl(var(--muted)/.65)] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-tl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-line font-medium">{msg.text}</p>

                      {/* Action Card inside Bot Message */}
                      {msg.actionCard && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-sm text-left">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              {msg.actionCard.badge && (
                                <span className="inline-block rounded-md bg-[hsl(var(--secondary)/.15)] px-1.5 py-0.5 text-[9px] font-bold text-[hsl(var(--secondary))] uppercase tracking-wider mb-1">
                                  {msg.actionCard.badge}
                                </span>
                              )}
                              <h4 className="font-bold text-xs text-[hsl(var(--foreground))]">
                                {msg.actionCard.title}
                              </h4>
                              {msg.actionCard.subtitle && (
                                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                                  {msg.actionCard.subtitle}
                                </p>
                              )}
                            </div>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--secondary))]">
                              <BookOpen size={14} />
                            </div>
                          </div>

                          {/* Direct Resources Preview */}
                          {msg.actionCard.resources && msg.actionCard.resources.length > 0 && (
                            <div className="my-2 divide-y divide-[hsl(var(--border)/.6)] rounded-lg border border-[hsl(var(--border)/.6)] bg-[hsl(var(--muted)/.2)] px-2">
                              {msg.actionCard.resources.map((r, idx) => (
                                <div key={idx} className="flex items-center justify-between py-1.5 text-[10px]">
                                  <span className="truncate pr-2 text-[hsl(var(--foreground))] font-medium flex items-center gap-1">
                                    <FileText size={11} className="text-[hsl(var(--secondary))]" />
                                    {r.title}
                                  </span>
                                  {r.url && (
                                    <a
                                      href={r.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 text-[hsl(var(--primary))] font-bold hover:underline"
                                    >
                                      Open ↗
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleActionNavigate(
                                msg.actionCard!.targetUrl,
                                msg.actionCard!.external
                              )
                            }
                            className="focus-ring mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                          >
                            <span>{msg.actionCard.buttonText}</span>
                            {msg.actionCard.external ? <ExternalLink size={12} /> : <ArrowRight size={12} />}
                          </button>
                        </div>
                      )}
                    </div>

                    <span className="mt-1 px-1 text-[9px] text-[hsl(var(--muted-foreground)/.7)]">
                      {msg.timestamp}
                    </span>

                    {/* Quick Replies Buttons */}
                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                        {msg.quickReplies.map((reply, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSendMessage(reply.value)}
                            className="focus-ring inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-[11px] font-semibold text-[hsl(var(--foreground))] hover:border-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary)/.1)] hover:text-[hsl(var(--secondary))] transition-colors cursor-pointer shadow-xs active:scale-95"
                          >
                            <span>{reply.label}</span>
                            <ChevronRight size={11} className="opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--muted)/.6)] px-3 py-2 w-fit">
                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--muted-foreground))] animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--muted-foreground))] animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--muted-foreground))] animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for notes, sem, or subjects..."
                  className="flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-2 text-xs font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:outline-hidden"
                  data-testid="input-ai-chat"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  aria-label="Send message"
                  data-testid="button-ai-chat-send"
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
