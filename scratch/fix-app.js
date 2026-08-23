const fs = require('fs');
let code = fs.readFileSync('scratch/App_original.tsx', 'utf8');

// 1. Fix imports
const duplicatedImports = `  useListSemesterQpDepartments,
  useCreateSemesterQpDepartment,
  useUpdateSemesterQpDepartment,
  useListIaDepartments,
  useCreateIaDepartment,
  useUpdateIaDepartment,

  useListSemesterQpDepartments,
  useCreateSemesterQpDepartment,
  useUpdateSemesterQpDepartment,
  useListIaDepartments,
  useCreateIaDepartment,
  useUpdateIaDepartment,`;
const fixedImports = `  useListSemesterQpDepartments,
  useCreateSemesterQpDepartment,
  useUpdateSemesterQpDepartment,
  useListIaDepartments,
  useCreateIaDepartment,
  useUpdateIaDepartment,`;
code = code.replace(duplicatedImports, fixedImports);

// 2. Define DepartmentManagerDialog
const departmentManagerDialog = `
function DepartmentManagerDialog({
  open,
  onOpenChange,
  title,
  departments,
  createDepartment,
  updateDepartment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  departments: { id: number; name: string; isActive: boolean; }[];
  createDepartment: ReturnType<any>;
  updateDepartment: ReturnType<any>;
}) {
  const [newDeptName, setNewDeptName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    createDepartment.mutate(
      { data: { name: newDeptName.trim(), isActive: true } },
      {
        onSuccess: () => {
          toast({ title: "Department added" });
          setNewDeptName("");
        },
        onError: (err: any) => toast({ title: "Failed to add", description: err.message, variant: "destructive" }),
        onSettled: () => setIsSubmitting(false),
      }
    );
  };

  const toggleActive = (id: number, current: boolean) => {
    updateDepartment.mutate(
      { id, data: { isActive: !current } },
      {
        onSuccess: () => toast({ title: "Status updated" }),
        onError: (err: any) => toast({ title: "Failed to update", description: err.message, variant: "destructive" })
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl bg-[hsl(var(--background))] border-[hsl(var(--border))]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            Manage the list of departments available for assignment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              placeholder="New department name (e.g. CSE)"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="input-style flex-1 h-9 text-xs"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting || !newDeptName.trim()}
              className="focus-ring h-9 rounded-xl bg-[hsl(var(--primary))] px-4 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs disabled:opacity-50"
            >
              Add
            </button>
          </form>

          <div className="border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card)/.5)] max-h-[300px] overflow-y-auto">
            {departments.length === 0 ? (
              <div className="p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">No departments found.</div>
            ) : (
              <ul className="divide-y divide-[hsl(var(--border))]">
                {departments.map((d) => (
                  <li key={d.id} className="flex items-center justify-between p-3">
                    <span className={\`text-sm font-bold \${!d.isActive ? 'text-[hsl(var(--muted-foreground))] line-through' : ''}\`}>
                      {d.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleActive(d.id, d.isActive)}
                      className={\`px-3 py-1 rounded-lg text-xs font-bold \${d.isActive ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}\`}
                    >
                      {d.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
`;

code = code.replace(/function AdminSemesterQpsSection\(\) \{/, departmentManagerDialog + '\n\nfunction AdminSemesterQpsSection() {');

// 3. Move AdminIaContributionsSection correctly, removing it from the end of the file if needed.
// Then place it right before AdminPyqs.
let contributionsSection = code.match(/function AdminIaContributionsSection\(\) \{[\s\S]*?\}\n\s*(?=\n|$)/);
if (contributionsSection) {
  // Remove it from the end
  code = code.replace(contributionsSection[0], '');
  // Fix the types and logic
  let fixedSection = contributionsSection[0]
    .replace('page, limit: 20', '') // Removed page and limit
    .replace('const [page, setPage] = useState(1);', '')
    .replace('setPage(1);', '')
    .replace('const items = (listResp?.items || []).filter', 'const items = (listResp || []).filter')
    .replace('{ status: activeStatus,  }', '{ status: activeStatus }');
    
  // Place before AdminPyqs
  code = code.replace(/function AdminPyqs\(\) \{/, fixedSection + '\n\nfunction AdminPyqs() {');
}

fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
