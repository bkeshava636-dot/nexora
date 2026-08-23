const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

// Update CreateSemesterQpDialog
code = code.replace(
  /function CreateSemesterQpDialog\(\{ open, onOpenChange \}: \{ open: boolean; onOpenChange: \(open: boolean\) => void \}\) \{\n  const createQp = useCreateSemesterQp\(\);\n  const \{ data: branches = \[\] \} = useListBranches\(\{ includeInactive: false \}\);/,
  `function CreateSemesterQpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createQp = useCreateSemesterQp();
  const { data: departmentsList = [] } = useListSemesterQpDepartments({ includeInactive: false });`
);

code = code.replace(
  /const computeSmartTitle = \(yr: string, sem: string, dept: string\) => \{\n    if \(dept\.trim\(\)\) \{\n      return \`\$\{yr\.trim\(\)\} • \$\{sem\.trim\(\)\} • \$\{dept\.trim\(\)\}\`;\n    \}\n    return \`\$\{yr\.trim\(\)\} • \$\{sem\.trim\(\)\}\`;\n  \};/g,
  `const computeSmartTitle = (yr: string, sem: string, dept: string) => {
    if (dept.trim()) {
      return \`\${yr.trim()} • \${sem.trim()} • \${dept.trim()}\`;
    }
    return \`\${yr.trim()} • \${sem.trim()}\`;
  };`
); // Keep it exactly as it was! The dept is just the string now.

code = code.replace(
  /<input\n\s+type="text"\n\s+value=\{department\}\n\s+onChange=\{\(e\) => handleDepartmentChange\(e\.target\.value\)\}\n\s+placeholder="e\.g\. CSE \/ AIML \/ AI \/ DS or ECE or Civil \(CV\)"\n\s+className="input-style h-9 text-xs"\n\s+data-testid="input-create-department"\n\s+required\n\s+\/>\n\s+<span className="text-\[10px\] text-\[hsl\(var\(--muted-foreground\)\)\]">Select from existing branches or type a custom stream<\/span>/,
  `<select
              value={department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 text-xs font-semibold"
              data-testid="input-create-department"
              required
            >
              <option value="" disabled>Select Department</option>
              {departmentsList.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>`
);

// Update EditSemesterQpDialog
code = code.replace(
  /function EditSemesterQpDialog\(\{ item, open, onOpenChange \}: \{ item: SemesterQpItem; open: boolean; onOpenChange: \(val: boolean\) => void \}\) \{\n  const updateQp = useUpdateSemesterQp\(\);\n  const \{ data: branches = \[\] \} = useListBranches\(\{ includeInactive: false \}\);/,
  `function EditSemesterQpDialog({ item, open, onOpenChange }: { item: SemesterQpItem; open: boolean; onOpenChange: (val: boolean) => void }) {
  const updateQp = useUpdateSemesterQp();
  const { data: departmentsList = [] } = useListSemesterQpDepartments({ includeInactive: false });`
);

code = code.replace(
  /<input\n\s+type="text"\n\s+value=\{department\}\n\s+onChange=\{\(e\) => setDepartment\(e\.target\.value\)\}\n\s+className="input-style h-9 text-xs"\n\s+data-testid="input-edit-department"\n\s+required\n\s+\/>/,
  `<select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 text-xs font-semibold"
              data-testid="input-edit-department"
              required
            >
              <option value="" disabled>Select Department</option>
              {departmentsList.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
              {!departmentsList.find(d => d.name === department) && department && (
                <option value={department}>{department} (Legacy)</option>
              )}
            </select>`
);


// Update CreateIaPaperDialog
code = code.replace(
  /function CreateIaPaperDialog\(\{ open, onOpenChange \}: \{ open: boolean; onOpenChange: \(open: boolean\) => void \}\) \{\n  const createIa = useCreateIaPaper\(\);\n  const \{ data: branches = \[\] \} = useListBranches\(\{ includeInactive: false \}\);/,
  `function CreateIaPaperDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createIa = useCreateIaPaper();
  const { data: departmentsList = [] } = useListIaDepartments({ includeInactive: false });`
);

code = code.replace(
  /<input\n\s+type="text"\n\s+value=\{department\}\n\s+onChange=\{\(e\) => handleDepartmentChange\(e\.target\.value\)\}\n\s+placeholder="e\.g\. CSE \/ AIML \/ AI \/ DS or ECE or Civil \(CV\)"\n\s+className="input-style h-9 text-xs"\n\s+data-testid="input-create-ia-dept"\n\s+required\n\s+\/>\n\s+<span className="text-\[10px\] text-\[hsl\(var\(--muted-foreground\)\)\]">Select from existing branches or type a custom stream<\/span>/,
  `<select
              value={department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 text-xs font-semibold"
              data-testid="input-create-ia-dept"
              required
            >
              <option value="" disabled>Select Department</option>
              {departmentsList.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>`
);

// Update EditIaPaperDialog
code = code.replace(
  /function EditIaPaperDialog\(\{ item, open, onOpenChange \}: \{ item: IaPaperItem; open: boolean; onOpenChange: \(val: boolean\) => void \}\) \{\n  const updateIa = useUpdateIaPaper\(\);\n  const \{ data: branches = \[\] \} = useListBranches\(\{ includeInactive: false \}\);/,
  `function EditIaPaperDialog({ item, open, onOpenChange }: { item: IaPaperItem; open: boolean; onOpenChange: (val: boolean) => void }) {
  const updateIa = useUpdateIaPaper();
  const { data: departmentsList = [] } = useListIaDepartments({ includeInactive: false });`
);

code = code.replace(
  /<input\n\s+type="text"\n\s+value=\{department\}\n\s+onChange=\{\(e\) => setDepartment\(e\.target\.value\)\}\n\s+className="input-style h-9 text-xs"\n\s+data-testid="input-edit-ia-dept"\n\s+required\n\s+\/>/,
  `<select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 text-xs font-semibold"
              data-testid="input-edit-ia-dept"
              required
            >
              <option value="" disabled>Select Department</option>
              {departmentsList.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
              {!departmentsList.find(d => d.name === department) && department && (
                <option value={department}>{department} (Legacy)</option>
              )}
            </select>`
);


fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
