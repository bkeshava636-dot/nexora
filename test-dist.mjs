import fs from 'fs';
const content = fs.readFileSync('./artifacts/api-server/dist/index.mjs', 'utf8');
console.log('Has /feedback:', content.includes('\"/feedback\"') || content.includes('\'/feedback\''));
console.log('Has feedback table:', content.includes('\"feedback\"'));
