const fs = require('fs');
const path = require('path');

const filePath = path.join('artifacts', 'nexora', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /const approveSubmission = useApproveSubmission\(\{ mutation: \{ onSuccess: \(\) => queryClient\.invalidateQueries\(\{ queryKey: getListSubmissionsQueryKey\(\) \}\) \} \}\);/g,
  "const approveSubmission = useApproveSubmission({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() }); queryClient.invalidateQueries({ queryKey: getListIaPapersQueryKey() }); queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() }); } } });"
);

content = content.replace(
  /const rejectSubmission = useRejectSubmission\(\{ mutation: \{ onSuccess: \(\) => queryClient\.invalidateQueries\(\{ queryKey: getListSubmissionsQueryKey\(\) \}\) \} \}\);/g,
  "const rejectSubmission = useRejectSubmission({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() }) } });"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.tsx submission invalidations updated.');
