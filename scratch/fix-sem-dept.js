const fs = require('fs');
let c = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

// 7. Fix CreateSemesterQpDialog
const createQpOld = `function CreateSemesterQpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (val: boolean) => void }) {
  const createQp = useCreateSemesterQp();
  const { data: branches = [] } = useListBranches({ includeInactive: false });
  const { data: qps = [] } = useListSemesterQps({ isPublished: "all" });`;

const createQpNew = `function CreateSemesterQpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (val: boolean) => void }) {
  const createQp = useCreateSemesterQp();
  const { data: semQpDepts = [] } = useListSemesterQpDepartments({ includeInactive: false });`;
c = c.replace(createQpOld, createQpNew);

c = c.replace(/const distinctDepartments = useMemo\(\(\) => \{\n    const set = new Set<string>\(\);\n    for \(const b of branches\) \{\n      if \(b\.name\) set\.add\(b\.name\);\n      if \(b\.shortName\) set\.add\(b\.shortName\);\n    \}\n    for \(const q of qps\) \{\n      if \(q\.department\) set\.add\(q\.department\);\n    \}\n    return Array\.from\(set\)\.sort\(\(a, b\) => a\.localeCompare\(b\)\);\n  \}, \[branches, qps\]\);/g, `const distinctDepartments = useMemo(() => {
    return semQpDepts.map((d: any) => d.name);
  }, [semQpDepts]);`);

// 8. Fix EditSemesterQpDialog
const editQpOld = `function EditSemesterQpDialog({ item, open, onOpenChange }: { item: SemesterQpItem; open: boolean; onOpenChange: (val: boolean) => void }) {
  const updateQp = useUpdateSemesterQp();
  const { data: branches = [] } = useListBranches({ includeInactive: false });
  const { data: qps = [] } = useListSemesterQps({ isPublished: "all" });`;

const editQpNew = `function EditSemesterQpDialog({ item, open, onOpenChange }: { item: SemesterQpItem; open: boolean; onOpenChange: (val: boolean) => void }) {
  const updateQp = useUpdateSemesterQp();
  const { data: semQpDepts = [] } = useListSemesterQpDepartments({ includeInactive: false });`;
c = c.replace(editQpOld, editQpNew);


// 9. Fix AdminSemesterQpsSection availableDepartments
c = c.replace(/const availableDepartments = useMemo\(\(\) => \{\n      const set = new Set<string>\(\);\n      for \(const b of branches\) \{\n        if \(b\.name\) set\.add\(b\.name\);\n        if \(b\.shortName\) set\.add\(b\.shortName\);\n      \}\n      for \(const q of qps\) \{\n        if \(q\.department\) set\.add\(q\.department\);\n      \}\n      return \["All", \.\.\.Array\.from\(set\)\.sort\(\(a, b\) => a\.localeCompare\(b\)\)\];\n    \}, \[branches, qps\]\);/g, `const availableDepartments = useMemo(() => {
      return ["All", ...semQpDepts.map((d: any) => d.name)];
    }, [semQpDepts]);`);


fs.writeFileSync('artifacts/nexora/src/App.tsx', c);
