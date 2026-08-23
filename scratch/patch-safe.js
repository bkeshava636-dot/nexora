const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

// 1. Add imports
const newImports = `
  useListSemesterQpDepartments,
  useCreateSemesterQpDepartment,
  useUpdateSemesterQpDepartment,
  useListIaDepartments,
  useCreateIaDepartment,
  useUpdateIaDepartment,
`;

code = code.replace(/import \{[\s\S]*?useListSemesterQps,[\s\S]*?\} from "@workspace\/api-client-react";/, (match) => {
  return match.replace(/useListSemesterQps,/, 'useListSemesterQps,' + newImports);
});

// 2. Add Hooks and Button to AdminSemesterQpsSection
const semQpHeaderSearch = 'data-testid="button-add-semester-qp"';
let idx = code.indexOf(semQpHeaderSearch);
if (idx !== -1) {
  let btnStart = code.lastIndexOf('<button', idx);
  let divEnd = code.indexOf('</div>', idx) + 6;
  
  let oldButton = code.substring(btnStart, divEnd - 6).trim(); // without </div>
  
  let newHtml = `<div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeptManagerOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary)/.15)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] transition-colors cursor-pointer w-fit"
          >
            Manage Departments
          </button>
          ${oldButton}
        </div>
      </div>
      
      <DepartmentManagerDialog
        open={deptManagerOpen}
        onOpenChange={setDeptManagerOpen}
        title="Semester QP Departments"
        departments={semQpDepts}
        createDepartment={createSemQpDept}
        updateDepartment={updateSemQpDept}
      />`;
      
  code = code.substring(0, btnStart) + newHtml + code.substring(divEnd);
}

// 3. Add Hooks and Button to AdminIaPapersSection
const iaHeaderSearch = 'data-testid="button-add-ia-paper"';
idx = code.indexOf(iaHeaderSearch);
if (idx !== -1) {
  let btnStart = code.lastIndexOf('<button', idx);
  let divEnd = code.indexOf('</div>', idx) + 6;
  
  let oldButton = code.substring(btnStart, divEnd - 6).trim(); // without </div>
  
  let newHtml = `<div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeptManagerOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary)/.15)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] transition-colors cursor-pointer w-fit"
          >
            Manage Departments
          </button>
          ${oldButton}
        </div>
      </div>
      
      <DepartmentManagerDialog
        open={deptManagerOpen}
        onOpenChange={setDeptManagerOpen}
        title="IA Departments"
        departments={iaDepts}
        createDepartment={createIaDept}
        updateDepartment={updateIaDept}
      />`;
      
  code = code.substring(0, btnStart) + newHtml + code.substring(divEnd);
}

// 4. Inject hooks at the top of functions
code = code.replace(/function AdminSemesterQpsSection\(\) \{/, `function AdminSemesterQpsSection() {\n  const [deptManagerOpen, setDeptManagerOpen] = useState(false);\n  const { data: semQpDepts = [] } = useListSemesterQpDepartments({ includeInactive: true });\n  const createSemQpDept = useCreateSemesterQpDepartment();\n  const updateSemQpDept = useUpdateSemesterQpDepartment();`);
code = code.replace(/function AdminIaPapersSection\(\) \{/, `function AdminIaPapersSection() {\n  const [deptManagerOpen, setDeptManagerOpen] = useState(false);\n  const { data: iaDepts = [] } = useListIaDepartments({ includeInactive: true });\n  const createIaDept = useCreateIaDepartment();\n  const updateIaDept = useUpdateIaDepartment();`);

fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
