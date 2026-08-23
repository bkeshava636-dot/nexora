const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

// Remove duplicate Hooks in Semester
code = code.replace(/const \[deptManagerOpen, setDeptManagerOpen\] = useState\(false\);\n\s*const \{ data: semQpDepts = \[\] \} = useListSemesterQpDepartments\(\{ includeInactive: true \}\);\n\s*const createSemQpDept = useCreateSemesterQpDepartment\(\);\n\s*const updateSemQpDept = useUpdateSemesterQpDepartment\(\);\n\s*/g, '');
code = code.replace(/function AdminSemesterQpsSection\(\) \{/, `function AdminSemesterQpsSection() {\n  const [deptManagerOpen, setDeptManagerOpen] = useState(false);\n  const { data: semQpDepts = [] } = useListSemesterQpDepartments({ includeInactive: true });\n  const createSemQpDept = useCreateSemesterQpDepartment();\n  const updateSemQpDept = useUpdateSemesterQpDepartment();\n`);

// Remove duplicate Hooks in IA
code = code.replace(/const \[deptManagerOpen, setDeptManagerOpen\] = useState\(false\);\n\s*const \{ data: iaDepts = \[\] \} = useListIaDepartments\(\{ includeInactive: true \}\);\n\s*const createIaDept = useCreateIaDepartment\(\);\n\s*const updateIaDept = useUpdateIaDepartment\(\);\n\s*/g, '');
code = code.replace(/function AdminIaPapersSection\(\) \{/, `function AdminIaPapersSection() {\n  const [deptManagerOpen, setDeptManagerOpen] = useState(false);\n  const { data: iaDepts = [] } = useListIaDepartments({ includeInactive: true });\n  const createIaDept = useCreateIaDepartment();\n  const updateIaDept = useUpdateIaDepartment();\n`);


// Keep only ONE AdminIaContributionsSection
const adminIaStart = 'function AdminIaContributionsSection() {';
const firstAdminIa = code.indexOf(adminIaStart);
if (firstAdminIa !== -1) {
    const nextAdminIa = code.indexOf(adminIaStart, firstAdminIa + 1);
    if (nextAdminIa !== -1) {
        code = code.substring(0, nextAdminIa);
    }
}

fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
