const fs = require('fs');
let c = fs.readFileSync('lib/api-spec/openapi.yaml', 'utf8');

c = c.replace(/enum:[\s\S]*?- 'Lecture notes'[\s\S]*?- 'Previous year paper'[\s\S]*?- 'Lab manual'[\s\S]*?- 'Assignment'[\s\S]*?- 'Reference'/g, 
  "enum:\n            - 'Lecture notes'\n            - 'Previous year paper'\n            - 'Lab manual'\n            - 'Assignment'\n            - 'Reference'\n            - 'Internal Assessment'\n            - 'zip'");

fs.writeFileSync('lib/api-spec/openapi.yaml', c);
