const fs = require('fs');
let c = fs.readFileSync('artifacts/api-server/src/routes/index.ts', 'utf8');
c = c.replace(/import semesterQpDepartmentsRouter.*\nimport iaDepartmentsRouter.*\n\n/, '');
c = c.replace(/import iaPapersRouter from ".\/ia-papers";\n/, 'import iaPapersRouter from "./ia-papers";\nimport semesterQpDepartmentsRouter from "./semester-qp-departments";\nimport iaDepartmentsRouter from "./ia-departments";\n');
fs.writeFileSync('artifacts/api-server/src/routes/index.ts', c);
