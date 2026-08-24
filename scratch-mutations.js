const fs = require('fs');
const path = require('path');

const filePath = path.join('artifacts', 'nexora', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  { search: /const updateFeedback = useUpdateFeedback\(\);/g, replace: "const updateFeedback = useUpdateFeedback({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey() }) } });" },
  { search: /const deleteFeedback = useDeleteFeedback\(\);/g, replace: "const deleteFeedback = useDeleteFeedback({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey() }) } });" },
  { search: /const resolve = useResolveReport\(\);/g, replace: "const resolve = useResolveReport({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() }) } });" },
  { search: /const dismiss = useDismissReport\(\);/g, replace: "const dismiss = useDismissReport({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() }) } });" },
  { search: /const deleteTemplate = useDeleteCurriculumTemplate\(\);/g, replace: "const deleteTemplate = useDeleteCurriculumTemplate({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() }) } });" },
  { search: /const createTemplate = useCreateCurriculumTemplate\(\);/g, replace: "const createTemplate = useCreateCurriculumTemplate({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() }) } });" },
  { search: /const updateTemplate = useUpdateCurriculumTemplate\(\);/g, replace: "const updateTemplate = useUpdateCurriculumTemplate({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() }) } });" },
  { search: /const addSubject = useCreateTemplateSubject\(\);/g, replace: "const addSubject = useCreateTemplateSubject({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() }) } });" },
  { search: /const deleteSubject = useDeleteTemplateSubject\(\);/g, replace: "const deleteSubject = useDeleteTemplateSubject({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() }) } });" },
  { search: /const updateSub = useUpdateTemplateSubject\(\);/g, replace: "const updateSub = useUpdateTemplateSubject({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() }) } });" },
  { search: /const updateQp = useUpdateSemesterQp\(\);/g, replace: "const updateQp = useUpdateSemesterQp({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSemesterQpsQueryKey() }) } });" },
  { search: /const createQp = useCreateSemesterQp\(\);/g, replace: "const createQp = useCreateSemesterQp({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSemesterQpsQueryKey() }) } });" },
  { search: /const deleteQp = useDeleteSemesterQp\(\);/g, replace: "const deleteQp = useDeleteSemesterQp({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSemesterQpsQueryKey() }) } });" },
  { search: /const updateIaPaper = useUpdateIaPaper\(\);/g, replace: "const updateIaPaper = useUpdateIaPaper({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIaPapersQueryKey() }) } });" },
  { search: /const createIa = useCreateIaPaper\(\);/g, replace: "const createIa = useCreateIaPaper({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIaPapersQueryKey() }) } });" },
  { search: /const updateIa = useUpdateIaPaper\(\);/g, replace: "const updateIa = useUpdateIaPaper({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIaPapersQueryKey() }) } });" },
  { search: /const deleteIa = useDeleteIaPaper\(\);/g, replace: "const deleteIa = useDeleteIaPaper({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIaPapersQueryKey() }) } });" },
  { search: /const approveSubmission = useApproveSubmission\(\);/g, replace: "const approveSubmission = useApproveSubmission({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() }) } });" },
  { search: /const rejectSubmission = useRejectSubmission\(\);/g, replace: "const rejectSubmission = useRejectSubmission({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() }) } });" },
];

replacements.forEach(r => {
  content = content.replace(r.search, r.replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.tsx updated with cache invalidations.');
