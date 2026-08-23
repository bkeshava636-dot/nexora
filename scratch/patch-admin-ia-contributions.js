const fs = require('fs');
let code = fs.readFileSync('artifacts/nexora/src/App.tsx', 'utf8');

const newSection = `
function AdminIaContributionsSection() {
  const [activeStatus, setActiveStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: listResp, isLoading } = useListSubmissions(
    { status: activeStatus, page, limit: 20 },
    qOpts(true)
  );

  const approveSubmission = useApproveSubmission();
  const rejectSubmission = useRejectSubmission();

  const handleApprove = (item: Submission) => {
    approveSubmission.mutate(
      { id: item.id, data: { isVerified: true, isFeatured: false } },
      {
        onSuccess: () => toast({ title: "Approved successfully", description: "The IA paper is now public." }),
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
      }
    );
  };

  const handleReject = () => {
    if (rejectingId === null) return;
    rejectSubmission.mutate(
      { id: rejectingId, data: { rejectionReason: rejectReason } },
      {
        onSuccess: () => {
          toast({ title: "Rejected successfully" });
          setRejectingId(null);
          setRejectReason("");
        },
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
      }
    );
  };

  // Filter out non-IA submissions client-side if they happen to bleed through
  const items = (listResp?.items || []).filter(item => item.resourceType === "Internal Assessment");

  return (
    <div className="space-y-6">
      <div className="flex border-b border-[hsl(var(--border))]">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setActiveStatus(s); setPage(1); }}
            className={\`px-4 py-2 text-xs font-bold capitalize border-b-2 \${activeStatus === s ? "border-[hsl(var(--secondary))] text-[hsl(var(--foreground))]" : "border-transparent text-[hsl(var(--muted-foreground))]"}\`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[hsl(var(--muted-foreground))]" /></div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]">No {activeStatus} IA contributions found.</div>
        ) : (
          items.map(item => (
            <div key={item.id} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl p-4 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm">{item.title}</h3>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {item.iaAcademicYear} • {item.iaSemester} • {item.iaDepartment} • {item.iaType}
                  </div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-2 border border-[hsl(var(--border))] rounded bg-[hsl(var(--background))] px-2 py-1 inline-block">
                    By {item.studentName} ({item.studentEmail}) on {new Date(item.submittedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <a href={item.googleDriveUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[hsl(var(--primary))] hover:underline self-end">
                    View Drive Link
                  </a>
                  {activeStatus === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => setRejectingId(item.id)} className="px-3 py-1 text-xs font-bold bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))] rounded-lg">Reject</button>
                      <button onClick={() => handleApprove(item)} className="px-3 py-1 text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg">Approve</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {rejectingId && (
        <Dialog open={true} onOpenChange={() => { setRejectingId(null); setRejectReason(""); }}>
          <DialogContent className="sm:max-w-md p-6 rounded-3xl">
            <DialogHeader><DialogTitle>Reject IA Contribution</DialogTitle></DialogHeader>
            <textarea
              className="input-style min-h-24 mt-4"
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectingId(null)} className="px-4 py-2 font-bold text-xs">Cancel</button>
              <button onClick={handleReject} disabled={rejectSubmission.isPending} className="px-4 py-2 bg-[hsl(var(--destructive))] text-white font-bold rounded-xl text-xs">Reject</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
`;

code = code + '\n' + newSection;
fs.writeFileSync('artifacts/nexora/src/App.tsx', code);
