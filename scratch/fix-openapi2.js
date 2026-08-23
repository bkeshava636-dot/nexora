const fs = require('fs');
let c = fs.readFileSync('lib/api-spec/openapi.yaml', 'utf8');

c = c.replace(/enum:\s*- 'Lecture notes'\s*- 'Previous year paper'\s*- 'Lab manual'\s*- 'Assignment'\s*- 'Reference'/g, 
  "enum:\n        - 'Lecture notes'\n        - 'Previous year paper'\n        - 'Lab manual'\n        - 'Assignment'\n        - 'Reference'\n        - 'Internal Assessment'\n        - 'zip'");

fs.writeFileSync('lib/api-spec/openapi.yaml', c);
