const fs = require('fs');
let c1 = fs.readFileSync('artifacts/api-server/src/routes/semester-qp-departments.ts', 'utf8');
c1 = c1.replace(/import \{ DepartmentInput, DepartmentUpdate \} from "@workspace\/api-zod";/, 'import { CreateSemesterQpDepartmentBody as DepartmentInput, UpdateSemesterQpDepartmentBody as DepartmentUpdate } from "@workspace/api-zod";');
fs.writeFileSync('artifacts/api-server/src/routes/semester-qp-departments.ts', c1);

let c2 = fs.readFileSync('artifacts/api-server/src/routes/ia-departments.ts', 'utf8');
c2 = c2.replace(/import \{ DepartmentInput, DepartmentUpdate \} from "@workspace\/api-zod";/, 'import { CreateIaDepartmentBody as DepartmentInput, UpdateIaDepartmentBody as DepartmentUpdate } from "@workspace/api-zod";');
fs.writeFileSync('artifacts/api-server/src/routes/ia-departments.ts', c2);
