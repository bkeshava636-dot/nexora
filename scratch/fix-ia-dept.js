const fs = require('fs');
let c = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

// 1. Add getListIaDepartmentsQueryKey and getListSemesterQpDepartmentsQueryKey to imports
c = c.replace(/getListSemestersQueryKey,/g, "getListSemestersQueryKey,\n  getListIaDepartmentsQueryKey,\n  getListSemesterQpDepartmentsQueryKey,");

// 2. Fix AdminSemesterQpsSection
const semQpSectionOld = `function AdminSemesterQpsSection() {
  const [deptManagerOpen, setDeptManagerOpen] = useState(false);
  const { data: semQpDepts = [] } = useListSemesterQpDepartments({ includeInactive: true });
  const createSemQpDept = useCreateSemesterQpDepartment();
  const updateSemQpDept = useUpdateSemesterQpDepartment();`;

const semQpSectionNew = `function AdminSemesterQpsSection() {
  const queryClient = useQueryClient();
  const [deptManagerOpen, setDeptManagerOpen] = useState(false);
  const { data: semQpDepts = [] } = useListSemesterQpDepartments({ includeInactive: true });
  const createSemQpDept = useCreateSemesterQpDepartment({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSemesterQpDepartmentsQueryKey() }) } });
  const updateSemQpDept = useUpdateSemesterQpDepartment({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSemesterQpDepartmentsQueryKey() }) } });`;
c = c.replace(semQpSectionOld, semQpSectionNew);

// 3. Fix AdminIaPapersSection
const iaSectionOld = `function AdminIaPapersSection() {
  const [deptManagerOpen, setDeptManagerOpen] = useState(false);
  const { data: iaDepts = [] } = useListIaDepartments({ includeInactive: true });
  const createIaDept = useCreateIaDepartment();
  const updateIaDept = useUpdateIaDepartment();`;

const iaSectionNew = `function AdminIaPapersSection() {
  const queryClient = useQueryClient();
  const [deptManagerOpen, setDeptManagerOpen] = useState(false);
  const { data: iaDepts = [] } = useListIaDepartments({ includeInactive: true });
  const createIaDept = useCreateIaDepartment({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIaDepartmentsQueryKey() }) } });
  const updateIaDept = useUpdateIaDepartment({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIaDepartmentsQueryKey() }) } });`;
c = c.replace(iaSectionOld, iaSectionNew);

// 4. Fix AdminIaPapersSection availableDepartments
c = c.replace(/const availableDepartments = useMemo\(\(\) => \{\n      const set = new Set<string>\(\);\n      for \(const b of branches\) \{\n        if \(b\.name\) set\.add\(b\.name\);\n        if \(b\.shortName\) set\.add\(b\.shortName\);\n      \}\n      for \(const p of iaPapers\) \{\n        if \(p\.department\) set\.add\(p\.department\);\n      \}\n      return \["All", \.\.\.Array\.from\(set\)\.sort\(\(a, b\) => a\.localeCompare\(b\)\)\];\n    \}, \[branches, iaPapers\]\);/g, `const availableDepartments = useMemo(() => {
      return ["All", ...iaDepts.map((d: any) => d.name)];
    }, [iaDepts]);`);

// 5. Fix CreateIaPaperDialog
const createIaOld = `function CreateIaPaperDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (val: boolean) => void }) {
  const createIa = useCreateIaPaper();
  const { data: branches = [] } = useListBranches({ includeInactive: false });
  const { data: iaPapers = [] } = useListIaPapers({ isPublished: "all" });`;

const createIaNew = `function CreateIaPaperDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (val: boolean) => void }) {
  const createIa = useCreateIaPaper();
  const { data: iaDepts = [] } = useListIaDepartments({ includeInactive: false });`;
c = c.replace(createIaOld, createIaNew);

c = c.replace(/const distinctDepartments = useMemo\(\(\) => \{\n    const set = new Set<string>\(\);\n    for \(const b of branches\) \{\n      if \(b\.name\) set\.add\(b\.name\);\n      if \(b\.shortName\) set\.add\(b\.shortName\);\n    \}\n    for \(const p of iaPapers\) \{\n      if \(p\.department\) set\.add\(p\.department\);\n    \}\n    return Array\.from\(set\)\.sort\(\(a, b\) => a\.localeCompare\(b\)\);\n  \}, \[branches, iaPapers\]\);/g, `const distinctDepartments = useMemo(() => {
    return iaDepts.map((d: any) => d.name);
  }, [iaDepts]);`);

// 6. Fix EditIaPaperDialog
const editIaOld = `function EditIaPaperDialog({ item, open, onOpenChange }: { item: IaPaperItem; open: boolean; onOpenChange: (val: boolean) => void }) {
  const updateIa = useUpdateIaPaper();
  const { data: branches = [] } = useListBranches({ includeInactive: false });
  const { data: iaPapers = [] } = useListIaPapers({ isPublished: "all" });`;

const editIaNew = `function EditIaPaperDialog({ item, open, onOpenChange }: { item: IaPaperItem; open: boolean; onOpenChange: (val: boolean) => void }) {
  const updateIa = useUpdateIaPaper();
  const { data: iaDepts = [] } = useListIaDepartments({ includeInactive: false });`;
c = c.replace(editIaOld, editIaNew);


fs.writeFileSync('artifacts/nexora/src/App.tsx', c);
