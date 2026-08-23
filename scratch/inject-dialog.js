const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || createDepartment.isPending) return;
    createDepartment.mutate(
      { data: { name: newDeptName.trim(), isActive: true } },
      {
        onSuccess: () => { setNewDeptName(""); toast({ title: "Department added" }); },
        onError: (err: unknown) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
      }
    );
  };

  const handleToggle = (id: number, currentActive: boolean) => {
    updateDepartment.mutate(
      { id, data: { isActive: !currentActive } },
      {
        onSuccess: () => toast({ title: currentActive ? "Department deactivated" : "Department activated" }),
        onError: (err: unknown) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
      }
    );
  };

  const handleRename = (id: number, currentName: string) => {
    const newName = window.prompt("Enter new department name:", currentName);
    if (!newName || newName.trim() === currentName) return;
    updateDepartment.mutate(
      { id, data: { name: newName.trim() } },
      {
        onSuccess: () => toast({ title: "Department renamed successfully" }),
        onError: (err: unknown) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl" data-testid="dialog-manage-departments">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="display-font text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
            Manage the list of departments available for this section.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="e.g. CSE"
              className="input-style h-9 flex-1 text-xs"
              required
            />
            <button
              type="submit"
              disabled={createDepartment.isPending || !newDeptName.trim()}
              className="focus-ring rounded-xl bg-[hsl(var(--primary))] px-3 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
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
                  <li key={d.id} className="flex items-center justify-between p-3 gap-4">
                    <span className={\`text-sm font-semibold \${!d.isActive ? "text-[hsl(var(--muted-foreground))] line-through" : ""}\`}>
                      {d.name}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => handleRename(d.id, d.name)} className="text-[11px] font-bold text-[hsl(var(--primary))] hover:underline">Rename</button>
                      <button onClick={() => handleToggle(d.id, d.isActive)} className={\`text-[11px] font-bold hover:underline \${d.isActive ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--accent-foreground))]"}\`}>
                        {d.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
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

// Only inject if not already present
if (!code.includes('function DepartmentManagerDialog')) {
  // Inject right before AdminSemesterQpsSection
  code = code.replace(/function AdminSemesterQpsSection\(\) \{/, departmentManagerDialog + '\n\nfunction AdminSemesterQpsSection() {');
  fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
  console.log("Injected DepartmentManagerDialog");
} else {
  console.log("Already present");
}
