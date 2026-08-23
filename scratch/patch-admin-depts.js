const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

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

// Update AdminSemesterQpsSection
const adminSemQpSearch = `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Semester Question Papers</h2>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            Manage legacy question papers grouped by year, semester, and department.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:bg-[hsl(var(--primary)/.9)] transition-colors cursor-pointer w-fit"
          data-testid="button-add-semester-qp"
        >
          <Plus size={15} />
          Add Paper
        </button>
      </div>`;

const adminSemQpReplace = `const [deptManagerOpen, setDeptManagerOpen] = useState(false);
  const { data: semQpDepts = [] } = useListSemesterQpDepartments({ includeInactive: true });
  const createSemQpDept = useCreateSemesterQpDepartment();
  const updateSemQpDept = useUpdateSemesterQpDepartment();

  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Semester Question Papers</h2>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            Manage legacy question papers grouped by year, semester, and department.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeptManagerOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary)/.15)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] transition-colors cursor-pointer w-fit"
          >
            Manage Departments
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:bg-[hsl(var(--primary)/.9)] transition-colors cursor-pointer w-fit"
            data-testid="button-add-semester-qp"
          >
            <Plus size={15} />
            Add Paper
          </button>
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

code = code.replace(adminSemQpSearch, adminSemQpReplace.replace(/const \[deptManagerOpen[\s\S]*?updateSemQpDept = .*?\n/, ''));
code = code.replace(/function AdminSemesterQpsSection\(\) \{/, `function AdminSemesterQpsSection() {\n  const [deptManagerOpen, setDeptManagerOpen] = useState(false);\n  const { data: semQpDepts = [] } = useListSemesterQpDepartments({ includeInactive: true });\n  const createSemQpDept = useCreateSemesterQpDepartment();\n  const updateSemQpDept = useUpdateSemesterQpDepartment();`);

// Update AdminIaPapersSection
const adminIaSearch = `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Internal Assessment Papers</h2>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            Manage continuous internal evaluation papers, Google Drive share links, and publish states.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:bg-[hsl(var(--primary)/.9)] transition-colors cursor-pointer w-fit"
          data-testid="button-add-ia-paper"
        >
          <Plus size={15} />
          Add Paper
        </button>
      </div>`;

const adminIaReplace = `const [deptManagerOpen, setDeptManagerOpen] = useState(false);
  const { data: iaDepts = [] } = useListIaDepartments({ includeInactive: true });
  const createIaDept = useCreateIaDepartment();
  const updateIaDept = useUpdateIaDepartment();

  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Internal Assessment Papers</h2>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            Manage continuous internal evaluation papers, Google Drive share links, and publish states.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeptManagerOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary)/.15)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] transition-colors cursor-pointer w-fit"
          >
            Manage Departments
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:bg-[hsl(var(--primary)/.9)] transition-colors cursor-pointer w-fit"
            data-testid="button-add-ia-paper"
          >
            <Plus size={15} />
            Add Paper
          </button>
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

code = code.replace(adminIaSearch, adminIaReplace.replace(/const \[deptManagerOpen[\s\S]*?updateIaDept = .*?\n/, ''));
code = code.replace(/function AdminIaPapersSection\(\) \{/, `function AdminIaPapersSection() {\n  const [deptManagerOpen, setDeptManagerOpen] = useState(false);\n  const { data: iaDepts = [] } = useListIaDepartments({ includeInactive: true });\n  const createIaDept = useCreateIaDepartment();\n  const updateIaDept = useUpdateIaDepartment();`);


fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
