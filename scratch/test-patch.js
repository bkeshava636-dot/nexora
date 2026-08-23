const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

// Clean up duplicate hooks
code = code.replace(/const \[deptManagerOpen, setDeptManagerOpen\] = useState\(false\);\n\s*const \{ data: semQpDepts = \[\] \} = useListSemesterQpDepartments\(\{ includeInactive: true \}\);\n\s*const createSemQpDept = useCreateSemesterQpDepartment\(\);\n\s*const updateSemQpDept = useUpdateSemesterQpDepartment\(\);\n\s*const \[deptManagerOpen, setDeptManagerOpen\] = useState\(false\);/, 
  'const [deptManagerOpen, setDeptManagerOpen] = useState(false);');

code = code.replace(/const \[deptManagerOpen, setDeptManagerOpen\] = useState\(false\);\n\s*const \{ data: iaDepts = \[\] \} = useListIaDepartments\(\{ includeInactive: true \}\);\n\s*const createIaDept = useCreateIaDepartment\(\);\n\s*const updateIaDept = useUpdateIaDepartment\(\);\n\s*const \[deptManagerOpen, setDeptManagerOpen\] = useState\(false\);/,
  'const [deptManagerOpen, setDeptManagerOpen] = useState(false);');


// Inject button for Semester QPs
let idx = code.indexOf('data-testid="button-add-semester-qp"');
if (idx !== -1) {
  let btnStart = code.lastIndexOf('<button', idx);
  let divStart = code.lastIndexOf('<div', btnStart);
  
  let injection = `<div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeptManagerOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary)/.15)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] transition-colors cursor-pointer w-fit"
          >
            Manage Departments
          </button>\n          `;
          
  code = code.substring(0, btnStart) + injection + code.substring(btnStart);
  
  let headerEnd = code.indexOf('</div>', idx) + 6;
  let dialogInjection = `\n\n      <DepartmentManagerDialog
        open={deptManagerOpen}
        onOpenChange={setDeptManagerOpen}
        title="Semester QP Departments"
        departments={semQpDepts}
        createDepartment={createSemQpDept}
        updateDepartment={updateSemQpDept}
      />\n`;
      
  code = code.substring(0, headerEnd) + dialogInjection + code.substring(headerEnd);
}

// Inject button for IA Papers
idx = code.indexOf('data-testid="button-add-ia-paper"');
if (idx !== -1) {
  let btnStart = code.lastIndexOf('<button', idx);
  
  let injection = `<div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeptManagerOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary)/.15)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] transition-colors cursor-pointer w-fit"
          >
            Manage Departments
          </button>\n          `;
          
  code = code.substring(0, btnStart) + injection + code.substring(btnStart);
  
  // Close the flex div. Wait, I added <div className="flex items-center gap-2">. I need to close it!
  // Same for Semester QPs! Let's just fix it by replacing the whole button.
}
fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
