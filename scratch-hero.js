const fs = require('fs');
const path = require('path');

const filePath = path.join('artifacts', 'nexora', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'Your BITM academic resource hub.',
  'Your BITM resources.<br />All in one place.'
);

content = content.replace(
  'Find notes, PYQs, study materials and other academic resources in one place.',
  'Notes, PYQs, and study materials. Curated for BITM students by BITM students.'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.tsx hero updated.');
