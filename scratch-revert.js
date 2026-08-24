const fs = require('fs');
const path = require('path');

const filePath = path.join('artifacts', 'nexora', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const reverts = [
  { search: /const deleteTemplate = useDeleteCurriculumTemplate\(\{.*\}\);/g, replace: "const deleteTemplate = useDeleteCurriculumTemplate();" },
  { search: /const createTemplate = useCreateCurriculumTemplate\(\{.*\}\);/g, replace: "const createTemplate = useCreateCurriculumTemplate();" },
  { search: /const updateTemplate = useUpdateCurriculumTemplate\(\{.*\}\);/g, replace: "const updateTemplate = useUpdateCurriculumTemplate();" },
  { search: /const addSubject = useCreateTemplateSubject\(\{.*\}\);/g, replace: "const addSubject = useCreateTemplateSubject();" },
  { search: /const deleteSubject = useDeleteTemplateSubject\(\{.*\}\);/g, replace: "const deleteSubject = useDeleteTemplateSubject();" },
  { search: /const updateSub = useUpdateTemplateSubject\(\{.*\}\);/g, replace: "const updateSub = useUpdateTemplateSubject();" },
  
  { search: /const updateQp = useUpdateSemesterQp\(\{.*\}\);/g, replace: "const updateQp = useUpdateSemesterQp();" },
  { search: /const createQp = useCreateSemesterQp\(\{.*\}\);/g, replace: "const createQp = useCreateSemesterQp();" },
  { search: /const deleteQp = useDeleteSemesterQp\(\{.*\}\);/g, replace: "const deleteQp = useDeleteSemesterQp();" },
  
  { search: /const updateIaPaper = useUpdateIaPaper\(\{.*\}\);/g, replace: "const updateIaPaper = useUpdateIaPaper();" },
  { search: /const createIa = useCreateIaPaper\(\{.*\}\);/g, replace: "const createIa = useCreateIaPaper();" },
  { search: /const updateIa = useUpdateIaPaper\(\{.*\}\);/g, replace: "const updateIa = useUpdateIaPaper();" },
  { search: /const deleteIa = useDeleteIaPaper\(\{.*\}\);/g, replace: "const deleteIa = useDeleteIaPaper();" },
];

reverts.forEach(r => {
  content = content.replace(r.search, r.replace);
});

// Wait, what about useUpdateFeedback, useResolveReport? Are they manually written too? Let's check api.ts later.
fs.writeFileSync(filePath, content, 'utf8');
