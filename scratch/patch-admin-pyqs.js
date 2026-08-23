const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

code = code.replace(
  /const \[activeTab, setActiveTab\] = useState<"semester" \| "ia">/,
  `const [activeTab, setActiveTab] = useState<"semester" | "ia" | "ia_contributions">`
);

code = code.replace(
  /const handleTabChange = \(tab: "semester" \| "ia"\) => \{/,
  `const handleTabChange = (tab: "semester" | "ia" | "ia_contributions") => {`
);

code = code.replace(
  /if \(tabParam === "ia" \|\| tabParam === "internal"\) return "ia";\n\s*\}?\n\s*return "semester";/,
  `if (tabParam === "ia" || tabParam === "internal") return "ia";\n      if (tabParam === "ia_contributions") return "ia_contributions";\n    }\n    return "semester";`
);

code = code.replace(
  /data-testid="admin-tab-ia-papers"\n\s*>\n\s*<ClipboardList size=\{16\} \/> Internal Assessment\n\s*<\/button>\n\s*<\/div>/,
  `data-testid="admin-tab-ia-papers"
        >
          <ClipboardList size={16} /> Internal Assessment
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("ia_contributions")}
          className={\`focus-ring inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer \${
            activeTab === "ia_contributions"
              ? "border-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          }\`}
          data-testid="admin-tab-ia-contributions"
        >
          <Inbox size={16} /> IA Contributions
        </button>
      </div>`
);

code = code.replace(
  /\{activeTab === "ia" && <AdminIaPapersSection \/>\}\n\s*<\/div>/,
  `{activeTab === "ia" && <AdminIaPapersSection />}
      {activeTab === "ia_contributions" && <AdminIaContributionsSection />}
    </div>`
);

fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
