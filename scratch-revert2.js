const fs = require('fs');
const path = require('path');

const filePath = path.join('artifacts', 'nexora', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const reverts = [
  { search: /const resolve = useResolveReport\(\{.*\}\);/g, replace: "const resolve = useResolveReport();" },
  { search: /const dismiss = useDismissReport\(\{.*\}\);/g, replace: "const dismiss = useDismissReport();" },
  { search: /const updateFeedback = useUpdateFeedback\(\{.*\}\);/g, replace: "const updateFeedback = useUpdateFeedback();" },
  { search: /const deleteFeedback = useDeleteFeedback\(\{.*\}\);/g, replace: "const deleteFeedback = useDeleteFeedback();" },
];

reverts.forEach(r => {
  content = content.replace(r.search, r.replace);
});

fs.writeFileSync(filePath, content, 'utf8');
