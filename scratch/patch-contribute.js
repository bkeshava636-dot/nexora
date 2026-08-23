const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

// I will extract the ContributePage entirely and replace it.
const contributePageStart = "function ContributePage() {";
const contributePageEnd = "function FormSection({ title, children }: { title: string; children: ReactNode }) {";

const newContributePage = `function ContributePage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ status: string; autoPublished?: boolean } | null>(null);
  
  const [contributionMode, setContributionMode] = useState<"resource" | "ia">("resource");

  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [yearId, setYearId] = useState<number | undefined>(undefined);
  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const [form, setForm] = useState({ resourceType: "Lecture notes" as ResourceType, title: "", description: "", googleDriveUrl: "", studentName: "", studentEmail: "" });
  
  const [iaForm, setIaForm] = useState({
    iaAcademicYear: "1st Year",
    iaSemester: "1st Semester • Odd",
    iaDepartment: "",
    iaType: "IA-1",
    title: "",
    googleDriveUrl: "",
    studentName: "",
    studentEmail: ""
  });

  const [error, setError] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateIa = (key: keyof typeof iaForm, value: string) => setIaForm((current) => ({ ...current, [key]: value }));

  const { data: branches = [] } = useListBranches();
  const { data: years = [] } = useListYears({ branchId: branchId as number }, qOpts(!!branchId));
  const { data: semesters = [] } = useListSemesters({ yearId: yearId as number }, qOpts(!!yearId));
  const { data: subjects = [] } = useListSubjects({ semesterId: semesterId as number }, qOpts(!!semesterId));
  const { data: iaDepartments = [] } = useListIaDepartments({ includeInactive: false });
  const createSubmission = useCreateSubmission();

  useEffect(() => { if (branches.length && branchId === undefined) setBranchId(branches[0]?.id); }, [branches, branchId]);
  useEffect(() => { if (years.length) setYearId((current) => current && years.some((y) => y.id === current) ? current : years[0]?.id); else setYearId(undefined); }, [years]);
  useEffect(() => { if (semesters.length) setSemesterId((current) => current && semesters.some((s) => s.id === current) ? current : semesters[0]?.id); else setSemesterId(undefined); }, [semesters]);
  useEffect(() => { if (subjects.length) setSubjectId((current) => current && subjects.some((s) => s.id === current) ? current : subjects[0]?.id); else setSubjectId(undefined); }, [subjects]);
  useEffect(() => { if (iaDepartments.length && !iaForm.iaDepartment) updateIa("iaDepartment", iaDepartments[0]?.name); }, [iaDepartments, iaForm.iaDepartment]);
  
  // Auto-generate title for IA
  useEffect(() => {
    if (contributionMode === "ia") {
      updateIa("title", \`\${iaForm.iaAcademicYear} • \${iaForm.iaSemester} • \${iaForm.iaDepartment} • \${iaForm.iaType}\`);
    }
  }, [iaForm.iaAcademicYear, iaForm.iaSemester, iaForm.iaDepartment, iaForm.iaType, contributionMode]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createSubmission.isPending) return;
    
    if (contributionMode === "resource") {
      if (!form.title.trim() || !form.studentName.trim() || !form.studentEmail.trim()) {
        setError("Please fill in the required fields before sending.");
        return;
      }
      if (!form.googleDriveUrl.trim() || !isValidGoogleDriveUrl(form.googleDriveUrl)) {
        setError("Please enter a valid Google Drive link.");
        return;
      }
      if (!subjectId) {
        setError("Please choose a branch, year, semester, and subject before sending.");
        return;
      }
      createSubmission.mutate({ data: { ...form, branchId, yearId, semesterId, subjectId } }, {
        onSuccess: (data: Submission & { autoPublished?: boolean }) => {
          const isAuto = data.status === "approved" || Boolean(data.autoPublished);
          setSubmittedData({ status: data.status, autoPublished: isAuto });
          setSubmitted(true);
          setError("");
          if (isAuto) {
            toast({ title: "Resource published successfully!", description: "You can now find it in the resource library." });
          } else {
            toast({ title: "Resource submitted successfully!", description: "Your submission will appear after admin review." });
          }
        },
        onError: (err) => setError(getErrorMessage(err) || "Unable to submit the resource. Please try again."),
      });
    } else {
      // IA submission
      if (!iaForm.title.trim() || !iaForm.studentName.trim() || !iaForm.studentEmail.trim() || !iaForm.iaDepartment.trim()) {
        setError("Please fill in the required fields before sending.");
        return;
      }
      if (!iaForm.googleDriveUrl.trim() || !isValidGoogleDriveUrl(iaForm.googleDriveUrl)) {
        setError("Please enter a valid Google Drive link.");
        return;
      }
      createSubmission.mutate({ 
        data: { 
          resourceType: "Internal Assessment" as ResourceType,
          title: iaForm.title,
          description: "Internal Assessment submission",
          googleDriveUrl: iaForm.googleDriveUrl,
          studentName: iaForm.studentName,
          studentEmail: iaForm.studentEmail,
          iaAcademicYear: iaForm.iaAcademicYear,
          iaSemester: iaForm.iaSemester,
          iaDepartment: iaForm.iaDepartment,
          iaType: iaForm.iaType
        } 
      }, {
        onSuccess: (data: Submission) => {
          setSubmittedData({ status: data.status, autoPublished: false });
          setSubmitted(true);
          setError("");
          toast({ title: "IA paper submitted successfully!", description: "It will appear after admin review." });
        },
        onError: (err) => setError(getErrorMessage(err) || "Unable to submit the paper. Please try again."),
      });
    }
  };

  if (submitted) {
    const isAuto = submittedData?.autoPublished || submittedData?.status === "approved";
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-7 sm:py-20">
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-14 text-center sm:px-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
            <CheckCircle2 size={32} />
          </div>
          <p className="micro-label mt-6 text-[hsl(var(--accent-foreground))]">
            {isAuto ? "Published to library" : "In the review queue"}
          </p>
          <h1 className="display-font mt-2 text-3xl font-bold tracking-[-.05em] sm:text-4xl">
            {isAuto ? "Published successfully!" : "Submitted successfully!"}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            {isAuto
              ? "You can now find it in the resource library. Thank you for contributing to Nexora!"
              : "Your submission will appear after admin review. Our student editors will check the link and details before it joins Nexora. That keeps the Verified badge meaningful for everyone."}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/resources"
              className="focus-ring rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
              data-testid="link-confirmation-library"
            >
              Browse the library
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setSubmittedData(null);
                setForm({ ...form, title: "", description: "", googleDriveUrl: "" });
                setIaForm({ ...iaForm, title: "", googleDriveUrl: "" });
                setError("");
              }}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-5 py-3 text-sm font-bold"
              data-testid="button-submit-another"
            >
              Share another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-7 sm:py-12"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contribute" }]} /><div className="mb-8 max-w-2xl"><p className="micro-label mb-2 text-[hsl(var(--accent-foreground))]">Give back a little</p><h1 className="display-font text-4xl font-bold tracking-[-.05em] sm:text-5xl">Put a useful file<br />in the right hands.</h1><p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Share material you trust. We review every submission before it becomes part of the library.</p></div>
    
    <div className="mb-6 flex gap-4">
      <button 
        type="button" 
        onClick={() => setContributionMode("resource")} 
        className={\`focus-ring px-5 py-2.5 rounded-xl text-sm font-bold transition-colors \${contributionMode === "resource" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "bg-[hsl(var(--secondary)/.15)] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/.3)]"}\`}
      >
        Resource
      </button>
      <button 
        type="button" 
        onClick={() => setContributionMode("ia")} 
        className={\`focus-ring px-5 py-2.5 rounded-xl text-sm font-bold transition-colors \${contributionMode === "ia" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "bg-[hsl(var(--secondary)/.15)] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/.3)]"}\`}
      >
        Internal Assessment Paper
      </button>
    </div>

    <form onSubmit={submit} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)] p-5 sm:p-8">
      {contributionMode === "resource" ? (
        <>
          <FormSection title="Where does it belong?">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Branch" required><select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value))} className="input-style">{branches.map((item) => <option key={item.id} value={item.id}>{item.shortName} — {item.name}</option>)}</select></Field>
              <Field label="Subject" required><select value={subjectId ?? ""} onChange={(e) => setSubjectId(Number(e.target.value))} className="input-style">{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Year" required><select value={yearId ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="input-style">{years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Semester" required><select value={semesterId ?? ""} onChange={(e) => setSemesterId(Number(e.target.value))} className="input-style">{semesters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            </div>
          </FormSection>
          <FormSection title="Tell us about it">
            <div className="grid gap-4">
              <Field label="Resource type" required><select value={form.resourceType} onChange={(e) => update("resourceType", e.target.value)} className="input-style">{resourceTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Title" required><input value={form.title} onChange={(e) => update("title", e.target.value)} className="input-style" placeholder="e.g. Data Structures revision notes" /></Field>
              <Field label="Short description"><textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="input-style min-h-24 resize-y" placeholder="What will a student find inside?" /></Field>
              <Field label="Google Drive link" required hint={\`\${googleDriveUrlHint} Also make sure link access is set to "Anyone with the link".\`}><div className="relative"><Link2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} /><input value={form.googleDriveUrl} onChange={(e) => update("googleDriveUrl", e.target.value)} className="input-style pl-11" placeholder="https://drive.google.com/..." /></div></Field>
            </div>
          </FormSection>
          <FormSection title="A little about you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" required><input value={form.studentName} onChange={(e) => update("studentName", e.target.value)} className="input-style" placeholder="How should we credit you?" /></Field>
              <Field label="College email" required><input type="email" value={form.studentEmail} onChange={(e) => update("studentEmail", e.target.value)} className="input-style" placeholder="you@college.edu" /></Field>
            </div>
          </FormSection>
        </>
      ) : (
        <>
          <FormSection title="IA Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Year" required>
                <select value={iaForm.iaAcademicYear} onChange={(e) => updateIa("iaAcademicYear", e.target.value)} className="input-style">
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
              </Field>
              <Field label="Semester" required>
                <select value={iaForm.iaSemester} onChange={(e) => updateIa("iaSemester", e.target.value)} className="input-style">
                  <option>1st Semester • Odd</option>
                  <option>2nd Semester • Even</option>
                  <option>3rd Semester</option>
                  <option>4th Semester</option>
                  <option>5th Semester</option>
                  <option>6th Semester</option>
                  <option>7th Semester</option>
                  <option>8th Semester</option>
                </select>
              </Field>
              <Field label="Department / Stream" required>
                <select value={iaForm.iaDepartment} onChange={(e) => updateIa("iaDepartment", e.target.value)} className="input-style">
                  {iaDepartments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="IA Type" required>
                <select value={iaForm.iaType} onChange={(e) => updateIa("iaType", e.target.value)} className="input-style">
                  <option>IA-1</option>
                  <option>IA-2</option>
                  <option>IA-3</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Title" required>
                <input value={iaForm.title} onChange={(e) => updateIa("title", e.target.value)} className="input-style" />
              </Field>
              <Field label="Google Drive link" required hint="Make sure your Google Drive file or folder is shared so students with the link can view it.">
                <div className="relative"><Link2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} /><input value={iaForm.googleDriveUrl} onChange={(e) => updateIa("googleDriveUrl", e.target.value)} className="input-style pl-11" placeholder="https://drive.google.com/..." /></div>
              </Field>
            </div>
          </FormSection>
          <FormSection title="A little about you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" required><input value={iaForm.studentName} onChange={(e) => updateIa("studentName", e.target.value)} className="input-style" placeholder="How should we credit you?" /></Field>
              <Field label="College email" required><input type="email" value={iaForm.studentEmail} onChange={(e) => updateIa("studentEmail", e.target.value)} className="input-style" placeholder="you@college.edu" /></Field>
            </div>
          </FormSection>
        </>
      )}

      {error && <div className="mb-4 mt-6 flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert"><CircleAlert size={15} className="mt-0.5 shrink-0" />{error}</div>}
      <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:items-center">
        <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">Submissions are checked by the Nexora student team.</p>
        <button type="submit" disabled={createSubmission.isPending} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-60 w-full sm:w-auto">
          {createSubmission.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send for review
        </button>
      </div>
    </form>
  </div>;
}
`;

const startIndex = code.indexOf(contributePageStart);
const endIndex = code.indexOf(contributePageEnd);

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newContributePage + code.substring(endIndex);
  fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
  console.log("Patched ContributePage successfully.");
} else {
  console.error("Could not find ContributePage block");
}
