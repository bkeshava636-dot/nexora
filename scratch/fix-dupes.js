const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

// 1. Remove all instances of the hooks
code = code.replace(/const \[deptManagerOpen, setDeptManagerOpen\] = useState\(false\);\s*const \{ data: semQpDepts = \[\] \} = useListSemesterQpDepartments\(\{ includeInactive: true \}\);\s*const createSemQpDept = useCreateSemesterQpDepartment\(\);\s*const updateSemQpDept = useUpdateSemesterQpDepartment\(\);\s*/g, '');

code = code.replace(/const \[deptManagerOpen, setDeptManagerOpen\] = useState\(false\);\s*const \{ data: iaDepts = \[\] \} = useListIaDepartments\(\{ includeInactive: true \}\);\s*const createIaDept = useCreateIaDepartment\(\);\s*const updateIaDept = useUpdateIaDepartment\(\);\s*/g, '');

// 2. Inject EXACTLY once
code = code.replace(/function AdminSemesterQpsSection\(\) \{/, `function AdminSemesterQpsSection() {\n  const [deptManagerOpen, setDeptManagerOpen] = useState(false);\n  const { data: semQpDepts = [] } = useListSemesterQpDepartments({ includeInactive: true });\n  const createSemQpDept = useCreateSemesterQpDepartment();\n  const updateSemQpDept = useUpdateSemesterQpDepartment();\n`);

code = code.replace(/function AdminIaPapersSection\(\) \{/, `function AdminIaPapersSection() {\n  const [deptManagerOpen, setDeptManagerOpen] = useState(false);\n  const { data: iaDepts = [] } = useListIaDepartments({ includeInactive: true });\n  const createIaDept = useCreateIaDepartment();\n  const updateIaDept = useUpdateIaDepartment();\n`);

fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
