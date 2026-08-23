const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

const oldImport = `  useListSemesterQpDepartments,
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

const newImport = `  useListSemesterQpDepartments,
  useCreateSemesterQpDepartment,
  useUpdateSemesterQpDepartment,
  useListIaDepartments,
  useCreateIaDepartment,
  useUpdateIaDepartment,`;

code = code.replace(oldImport, newImport);

// Fix IA contributions section lines
code = code.replace(/\{ status: activeStatus, page, limit: 20 \}/g, '{ status: activeStatus }');
code = code.replace(/const items = \(listResp\?\.items \|\| \[\]\)\.filter/g, 'const items = (listResp || []).filter');
code = code.replace(/items\.map\(item =>/g, 'items.map((item: any) =>');
code = code.replace(/const handleApprove = \(item: Submission\) =>/g, 'const handleApprove = (item: any) =>');

fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
