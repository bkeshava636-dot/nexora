const fs = require('fs');
const path = require('path');
const filePath = path.join('artifacts', 'nexora', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(
  'useListIaPapers,',
  'useListIaPapers, getListIaPapersQueryKey,'
);
fs.writeFileSync(filePath, content, 'utf8');
