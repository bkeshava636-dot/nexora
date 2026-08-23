const fs = require('fs');
let c = fs.readFileSync('lib/api-spec/openapi.yaml', 'utf8');

c = c.replace(/enum:\n        - "Lecture notes"\n        - "Previous year paper"\n        - "Lab manual"\n        - "Assignment"\n        - "Reference"\n        - "Internal Assessment"\n        - "zip"/g, 
  'enum:\n        - "Lecture notes"\n        - "Previous year paper"\n        - "Lab manual"\n        - "Assignment"\n        - "Reference"\n        - "Internal Assessment"');

fs.writeFileSync('lib/api-spec/openapi.yaml', c);
