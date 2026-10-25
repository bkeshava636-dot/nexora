import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Bot,
  Sparkles,
  X,
  Send,
  RotateCcw,
  BookOpen,
  GraduationCap,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileText,
  Search,
  CheckCircle2,
  Minimize2,
  Maximize2,
  HelpCircle,
  Upload,
  Link2,
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
  type ImportantLinkItem,
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

interface ParsedQuery {
  subjectName?: string;
  semesterNum?: number;
  branchCode?: string;
  intent: "notes" | "pyq" | "ia" | "syllabus" | "links" | "contribute" | "general";
}

// Subject synonyms dictionary for intelligent alias matching
const SYNONYMS: Record<string, string[]> = {
  maths: [
    "math", "maths", "mathematics", "m1", "m2", "m3", "m4", "calculus",
    "linear algebra", "differential", "fourier", "numerical", "complex analysis",
    "probability", "statistics", "transform calculus",
  ],
  physics: ["physics", "phy", "quantum", "semiconductor", "optics", "modern physics"],
  chemistry: ["chemistry", "chem", "corrosion", "polymers", "battery", "sensors"],
  dsa: ["dsa", "data structures", "data structure", "ds", "linked list", "trees", "graphs", "stacks", "queues"],
  algorithms: ["daa", "algorithm", "algorithms", "design and analysis of algorithms"],
  dbms: ["dbms", "database", "databases", "sql", "rdbms"],
  os: ["os", "operating system", "operating systems", "unix", "linux"],
  cn: ["cn", "computer networks", "networking", "network", "networks", "tcp", "ip"],
  programming: ["c programming", "c prog", "python", "java", "oops", "object oriented", "cpp", "c++"],
  ai: ["ai", "artificial intelligence", "ml", "machine learning", "deep learning", "neural"],
  microcontroller: ["mpmc", "microcontroller", "microprocessor", "arm", "8086", "8051", "embedded"],
  electronics: ["electronics", "dld", "ade", "digital electronics", "analog", "signals", "circuits", "vlsi"],
  mechanical: ["mechanics", "thermo", "thermodynamics", "som", "strength of materials", "fluid mechanics", "cad", "cam"],
  civil: ["civil", "surveying", "concrete", "structural", "geotechnical", "environment", "hydraulics"],
  constitution: ["constitution", "cip", "ethics", "kannada", "english", "evs", "environmental studies"],
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
}

function parseUserIntent(rawInput: string): ParsedQuery {
  const norm = normalizeText(rawInput);
  const words = norm.split(/\s+/);

  // 1. Detect Semester
  let semesterNum: number | undefined;
  const semMatch = norm.match(/\b(?:sem|semester|s)\s*([1-8])\b/) ||
                   norm.match(/\b([1-8])(?:st|nd|rd|th)?\s*(?:sem|semester)\b/) ||
                   norm.match(/\bsem([1-8])\b/);
  if (semMatch) {
    semesterNum = parseInt(semMatch[1], 10);
  } else if (norm.includes("first sem") || norm.includes("first year sem 1")) {
    semesterNum = 1;
  } else if (norm.includes("second sem") || norm.includes("2nd sem")) {
    semesterNum = 2;
  } else if (norm.includes("third sem") || norm.includes("3rd sem")) {
    semesterNum = 3;
  } else if (norm.includes("fourth sem") || norm.includes("4th sem")) {
    semesterNum = 4;
  } else if (norm.includes("fifth sem") || norm.includes("5th sem")) {
    semesterNum = 5;
  } else if (norm.includes("sixth sem") || norm.includes("6th sem")) {
    semesterNum = 6;
  } else if (norm.includes("seventh sem") || norm.includes("7th sem")) {
    semesterNum = 7;
  } else if (norm.includes("eighth sem") || norm.includes("8th sem")) {
    semesterNum = 8;
  }

  // 2. Detect Intent
  let intent: ParsedQuery["intent"] = "notes";
  if (norm.includes("pyq") || norm.includes("question paper") || norm.includes("previous year") || norm.includes("qp")) {
    intent = "pyq";
  } else if (norm.includes("ia") || norm.includes("internal") || norm.includes("midterm") || norm.includes("cie")) {
    intent = "ia";
  } else if (norm.includes("syllabus") || norm.includes("scheme") || norm.includes("curriculum")) {
    intent = "syllabus";
  } else if (norm.includes("result") || norm.includes("results") || norm.includes("portal") || norm.includes("vtu") || norm.includes("link") || norm.includes("calendar")) {
    intent = "links";
  } else if (norm.includes("upload") || norm.includes("contribute") || norm.includes("submit notes")) {
    intent = "contribute";
  }

  // 3. Detect Subject
  let matchedSubjectKey: string | undefined;
  for (const [key, aliases] of Object.entries(SYNONYMS)) {
    if (aliases.some((alias) => norm.includes(alias))) {
      matchedSubjectKey = key;
      break;
    }
  }

  // Detect Branch
  let branchCode: string | undefined;
  const branchKeywords = ["cse", "aiml", "ai", "ece", "eee", "mech", "civil", "ise", "csbs"];
  for (const b of branchKeywords) {
    if (words.includes(b)) {
      branchCode = b.toUpperCase();
      break;
    }
  }

  return {
    subjectName: matchedSubjectKey,
    semesterNum,
    branchCode,
    intent,
  };
}

export function AiAssistantModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [, setLocation] = useLocation();

  // Queries
  const { data: allSubjects = [] } = useListSubjects();
  const { data: allSemesters = [] } = useListSemesters();
  const { data: allYears = [] } = useListYears();
  const { data: branches = [] } = useListBranches();
  const { data: resources = [] } = useListResources();
  const { data: quickLinks = [] } = useListQuickLinks();

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Hi! I'm your **Nexora Study Assistant**.\n\nAsk me for any notes, question papers, or subjects — for example:\n• *\"I need maths notes\"*\n• *\"3rd sem DSA PYQs\"*\n• *\"VTU results link\"*\n\nHow can I help you study today?",
      timestamp: "Just now",
      quickReplies: [
        { label: "📐 Maths Notes", value: "i need maths notes" },
        { label: "💻 Data Structures", value: "data structures notes" },
        { label: "📄 3rd Sem PYQs", value: "3rd sem pyqs" },
        { label: "🔗 College Results Link", value: "results link" },
      ],
    },
  ]);

  // Conversational state memory
  const [activeContext, setActiveContext] = useState<{
    subjectKey?: string;
    intent?: string;
    pendingOptions?: { subject: Subject; semNumber: number }[];
  }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  // Helper map: semesterId -> semester number
  const semesterMap = useMemo(() => {
    const map = new Map<number, { number: number; name: string }>();
    allSemesters.forEach((sem) => {
      let num = 0;
      const m = sem.name.match(/\b([1-8])\b/);
      if (m) num = parseInt(m[1], 10);
      map.set(sem.id, { number: num, name: sem.name });
    });
    return map;
  }, [allSemesters]);

  // Subject matching logic
  const findMatchingSubjects = (subjectKey: string, targetSem?: number) => {
    const aliases = SYNONYMS[subjectKey] || [subjectKey];
    return allSubjects.filter((subj) => {
      const subjNorm = normalizeText(subj.name + " " + (subj.description || ""));
      const matchesAlias = aliases.some((alias) => subjNorm.includes(alias));
      if (!matchesAlias) return false;

      if (targetSem !== undefined) {
        const semInfo = semesterMap.get(subj.semesterId);
        if (semInfo && semInfo.number > 0 && semInfo.number !== targetSem) {
          return false;
        }
      }
      return true;
    });
  };

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

    // Process intelligence
    setTimeout(() => {
      processBotResponse(userQuery);
      setIsTyping(false);
    }, 450);
  };

  const processBotResponse = (userText: string) => {
    const parsed = parseUserIntent(userText);
    const norm = normalizeText(userText);

    // 1. Check if user is answering a pending "Which semester?" question
    if (activeContext.pendingOptions && activeContext.pendingOptions.length > 0) {
      const chosenSem = parsed.semesterNum;
      if (chosenSem) {
        const matchedOption = activeContext.pendingOptions.find((opt) => opt.semNumber === chosenSem) ||
                              activeContext.pendingOptions[0];

        if (matchedOption) {
          const targetSubj = matchedOption.subject;
          const subjResources = resources.filter((r) => r.subjectId === targetSubj.id);
          const notesCount = subjResources.filter((r) => r.resourceType?.toLowerCase().includes("note")).length;

          const responseMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: `🎯 Here is the shelf for **Semester ${matchedOption.semNumber}: ${targetSubj.name}**!${
              notesCount > 0 ? ` Found **${notesCount} notes & materials** ready to study.` : ""
            }`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            actionCard: {
              type: "subject",
              title: targetSubj.name,
              subtitle: `Semester ${matchedOption.semNumber} • ${subjResources.length} Resources available`,
              badge: `Sem ${matchedOption.semNumber}`,
              targetUrl: `/subject/${targetSubj.id}`,
              buttonText: `Take me to ${targetSubj.name.slice(0, 24)} Shelf`,
              resources: subjResources.slice(0, 3).map((r) => ({
                title: r.title,
                url: r.googleDriveUrl,
                type: r.resourceType || "Notes",
              })),
            },
            quickReplies: [
              { label: "📄 Check PYQs for this", value: `pyqs for ${targetSubj.name}` },
              { label: "🔍 Search another subject", value: "search another subject" },
            ],
          };

          setActiveContext({});
          setMessages((prev) => [...prev, responseMsg]);
          return;
        }
      }
    }

    // 2. Quick Links / Results Intent
    if (parsed.intent === "links" || norm.includes("result") || norm.includes("portal") || norm.includes("calendar")) {
      const matchingLinks = quickLinks.filter((l) =>
        norm.includes("result") ? l.title.toLowerCase().includes("result") || l.category.toLowerCase().includes("result") : true
      );
      const topLink = matchingLinks[0] || quickLinks[0];

      const responseMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: topLink
          ? `🔗 Here is the official link for **${topLink.title}**! You can open it directly or view all verified academic portals:`
          : "🔗 Here are the official academic links and portals for results, calendars, and syllabus:",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionCard: {
          type: "link",
          title: topLink ? topLink.title : "Official Quick Links & Portals",
          subtitle: topLink ? (topLink.description ?? undefined) : "VTU result portals, academic calendar, exam notifications",
          badge: "Official Portal",
          targetUrl: topLink ? topLink.url : "/quick-links",
          external: !!topLink,
          buttonText: topLink ? "Open Portal Directly ↗" : "View All Quick Links",
        },
        quickReplies: [
          { label: "View all Quick Links", value: "all quick links" },
          { label: "Maths Notes", value: "i need maths notes" },
        ],
      };
      setMessages((prev) => [...prev, responseMsg]);
      return;
    }

    // 3. Contribute Intent
    if (parsed.intent === "contribute") {
      const responseMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "✨ Want to help your fellow BITM students? You can upload notes, question papers, and study guides with **zero-cost instant upload**!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionCard: {
          type: "contribute",
          title: "Contribute Study Material",
          subtitle: "Upload PDF directly (up to 25 MB or Google Drive link). Your credits are saved!",
          badge: "Zero-Cost Storage",
          targetUrl: "/contribute",
          buttonText: "Go to Contribute Page ➔",
        },
      };
      setMessages((prev) => [...prev, responseMsg]);
      return;
    }

    // 4. PYQ Intent without subject
    if (parsed.intent === "pyq" && !parsed.subjectName) {
      const responseMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: parsed.semesterNum
          ? `📝 Looking for Semester ${parsed.semesterNum} Question Papers? We have both end-sem VTU papers and mid-term IA papers available!`
          : "📝 We have a dedicated archive of Semester Question Papers (PYQs) and Internal Assessment (IA) papers across all departments!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionCard: {
          type: "pyqs",
          title: parsed.semesterNum ? `Semester ${parsed.semesterNum} Question Papers` : "PYQs & Question Papers Archive",
          subtitle: "Browse Autonomous & VTU End-Sem papers and Internal Assessment tests",
          badge: "Exam Prep",
          targetUrl: "/pyqs",
          buttonText: "Explore PYQ Archive ➔",
        },
        quickReplies: [
          { label: "📐 Maths PYQs", value: "maths pyq" },
          { label: "💻 CSE / AIML PYQs", value: "cse pyqs" },
          { label: "⚡ ECE PYQs", value: "ece pyqs" },
        ],
      };
      setMessages((prev) => [...prev, responseMsg]);
      return;
    }

    // 5. Subject Search Intent (e.g. "I need maths notes" or "data structures")
    const subjectKey = parsed.subjectName || (norm.includes("math") ? "maths" : undefined);

    if (subjectKey) {
      const matched = findMatchingSubjects(subjectKey);

      if (matched.length === 0) {
        // Fallback: general query search in all subjects
        const generalMatches = allSubjects.filter((s) =>
          normalizeText(s.name).includes(norm) || norm.includes(normalizeText(s.name))
        );

        if (generalMatches.length > 0) {
          const first = generalMatches[0];
          const semInfo = semesterMap.get(first.semesterId);
          const responseMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: `📚 I found **${first.name}**! Here is the direct link to the study shelf:`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            actionCard: {
              type: "subject",
              title: first.name,
              subtitle: semInfo ? `Semester ${semInfo.number}` : undefined,
              badge: semInfo ? `Sem ${semInfo.number}` : "Subject",
              targetUrl: `/subject/${first.id}`,
              buttonText: `Open ${first.name.slice(0, 20)} Shelf ➔`,
            },
          };
          setMessages((prev) => [...prev, responseMsg]);
          return;
        }

        // Search in general resources
        const matchingRes = resources.filter((r) =>
          normalizeText(r.title).includes(norm) || norm.includes(normalizeText(r.title))
        );

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
              badge: res.resourceType || "Document",
              targetUrl: `/resources?query=${encodeURIComponent(userText)}`,
              buttonText: "View in Resource Library ➔",
            },
          };
          setMessages((prev) => [...prev, responseMsg]);
          return;
        }

        // No matches found
        const responseMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: `🤔 I couldn't find a direct match for *"${userText}"*. Try searching by subject name (like *Maths*, *Physics*, *DSA*, *DBMS*) or browse our library.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          quickReplies: [
            { label: "📐 Maths Notes", value: "maths notes" },
            { label: "💻 Data Structures", value: "data structures notes" },
            { label: "📚 Browse All Resources", value: "browse all resources" },
          ],
        };
        setMessages((prev) => [...prev, responseMsg]);
        return;
      }

      // Group matches by semester
      const semOptionsMap = new Map<number, Subject>();
      matched.forEach((subj) => {
        const sem = semesterMap.get(subj.semesterId);
        const semNum = sem?.number ?? 1;
        if (!semOptionsMap.has(semNum)) {
          semOptionsMap.set(semNum, subj);
        }
      });

      const options = Array.from(semOptionsMap.entries())
        .map(([semNumber, subject]) => ({ semNumber, subject }))
        .sort((a, b) => a.semNumber - b.semNumber);

      // If user specified a semester or only 1 semester exists:
      if (parsed.semesterNum || options.length === 1) {
        const targetSem = parsed.semesterNum ?? options[0].semNumber;
        const selected = options.find((o) => o.semNumber === targetSem) || options[0];
        const subj = selected.subject;
        const subjResources = resources.filter((r) => r.subjectId === subj.id);
        const notesCount = subjResources.filter((r) => r.resourceType?.toLowerCase().includes("note")).length;

        const responseMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: `🎯 Found **Semester ${selected.semNumber} ${subj.name}**!${
            notesCount > 0 ? ` There are **${notesCount} notes & study materials** available.` : ""
          }`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionCard: {
            type: "subject",
            title: subj.name,
            subtitle: `Semester ${selected.semNumber} • ${subjResources.length} Resources available`,
            badge: `Sem ${selected.semNumber}`,
            targetUrl: `/subject/${subj.id}`,
            buttonText: `Take me to ${subj.name.slice(0, 24)} Shelf ➔`,
            resources: subjResources.slice(0, 3).map((r) => ({
              title: r.title,
              url: r.googleDriveUrl,
              type: r.resourceType || "Notes",
            })),
          },
          quickReplies: [
            { label: "📄 See PYQs", value: `pyqs for ${subj.name}` },
            { label: "📐 Other Maths Semesters", value: "maths notes" },
          ],
        };
        setMessages((prev) => [...prev, responseMsg]);
        return;
      }

      // MULTIPLE SEMESTERS FOUND -> Ask clarifying question as requested!
      const subjectTitleNice = subjectKey === "maths" ? "Mathematics" : subjectKey.toUpperCase();
      const semChips = options.map((opt) => ({
        label: `Sem ${opt.semNumber} (${opt.subject.name.slice(0, 20)}...)`,
        value: `sem ${opt.semNumber}`,
      }));

      // Store in memory state for next response
      setActiveContext({
        subjectKey,
        pendingOptions: options,
      });

      const responseMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: `📚 I found **${subjectTitleNice}** across several semesters!\n\n**Which semester are you looking for?** Click below or type your semester:`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        quickReplies: semChips,
      };

      setMessages((prev) => [...prev, responseMsg]);
      return;
    }

    // Default conversational fallback
    const responseMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: "bot",
      text: "✨ I'm here to help you find whatever you need! What subject, semester, or study material are you looking for?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      quickReplies: [
        { label: "📐 Maths Notes", value: "i need maths notes" },
        { label: "💻 Data Structures", value: "data structures notes" },
        { label: "📄 Previous Year Question Papers", value: "pyqs" },
        { label: "🔗 College Results Link", value: "results link" },
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
                    PRO
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
                        { label: "💻 Data Structures", value: "data structures notes" },
                        { label: "📄 3rd Sem PYQs", value: "3rd sem pyqs" },
                      ],
                    },
                  ]);
                  setActiveContext({});
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
