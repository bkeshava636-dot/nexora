import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, FileText, Mail, Shield, ShieldCheck } from "lucide-react";

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <ArrowLeft size={14} /> Back to home
        </Link>
      </div>

      <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-10 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="display-font text-2xl font-bold sm:text-3xl">Privacy Policy</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Compliance with the Digital Personal Data Protection Act, 2023 (India) & IT Act 2000
            </p>
          </div>
        </div>

        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-[hsl(var(--muted-foreground))] space-y-6">
          <section className="rounded-2xl bg-[hsl(var(--muted)/.4)] p-4 text-xs text-[hsl(var(--foreground))] border border-[hsl(var(--border)/.5)]">
            <p className="font-semibold text-[hsl(var(--foreground))] mb-1">Summary for Students</p>
            Nexora is an unofficial, non-profit academic resource platform built by students for students. We do not sell your personal data, we do not require mandatory account creation to browse notes, and our AI assistant conversations are ephemeral (never saved to the database).
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">1. Identity and Scope</h2>
            <p>
              Nexora (&quot;we&quot;, &quot;us&quot;, &quot;the platform&quot;) operates as an independent study desk and academic repository for engineering students. This Privacy Policy outlines our standards for collecting, processing, and safeguarding data in accordance with the <strong>Digital Personal Data Protection Act (DPDP Act 2023)</strong> and the <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">2. Data We Collect and How We Use It</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Public Browsing & Analytics:</strong> When you navigate Nexora, our backend logs aggregate statistics (paths visited, device type). To protect student anonymity, your IP address is <em>cryptographically hashed using SHA-256</em> before storage and truncated. Raw IP addresses are never permanently retained.
              </li>
              <li>
                <strong>Student Contributions:</strong> When submitting notes or study material, you may optionally provide your name, USN, and student email for credit. This information is used strictly to attribute author credits and prevent fraudulent uploads.
              </li>
              <li>
                <strong>Feedback Submissions:</strong> Information provided via the feedback dialog (category, message, optional email) is utilized exclusively to resolve software bugs and curriculum requests.
              </li>
              <li>
                <strong>AI Academic Assistant:</strong> Conversations with the Nexora AI Assistant (powered by Google Gemini) are held in your browser session memory. We do not store your chat logs or questions in our database.
              </li>
              <li>
                <strong>Voluntary Donations (&quot;Buy Me Paneer&quot;):</strong> Payment processing is handled by <strong>Razorpay</strong>, an authorized, PCI-DSS Level 1 certified payment gateway. Nexora does not collect, process, or store credit card, debit card, or UPI PIN credentials.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">3. Cookies and Google AdSense</h2>
            <p>
              Nexora uses standard first-party session identifiers strictly necessary for site navigation and CSRF security. We also integrate Google AdSense to offset cloud hosting costs. Third-party vendors, including Google, use cookies to serve ads based on prior visits. You may opt out of personalized advertising by visiting{" "}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--primary))] underline"
              >
                Google Ads Settings
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">4. Data Security Safeguards</h2>
            <p>
              All traffic between your browser and our servers is encrypted in transit using Transport Layer Security (TLS 1.3 / HTTPS). Our database is secured with parameterized queries to eliminate injection vulnerabilities, and administrative access is protected with salt-hashed credentials and signed HTTP-only cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">5. Student Rights (Right to Erasure & Correction)</h2>
            <p>
              Under Chapter III of the DPDP Act 2023, you have the right to request access to any personal data you have shared with us, request correction of errors, or request immediate deletion (erasure) of any notes or submissions you previously contributed.
            </p>
          </section>

          <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <h3 className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail size={14} className="text-[hsl(var(--secondary))]" /> Grievance Officer & Privacy Inquiries
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              For any privacy inquiries, data deletion requests, or grievances under the DPDP Act, contact us at:
              <br />
              <strong className="text-[hsl(var(--foreground))]">Email:</strong> privacy@nexora.app (or submit a notice via the in-app Feedback dialog).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <ArrowLeft size={14} /> Back to home
        </Link>
      </div>

      <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-10 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--secondary)/.1)] text-[hsl(var(--secondary))]">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="display-font text-2xl font-bold sm:text-3xl">Terms & Academic Fair-Use Disclaimer</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Terms of Service, Educational Fair Dealing & Takedown Policy
            </p>
          </div>
        </div>

        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-[hsl(var(--muted-foreground))] space-y-6">
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
            <p className="font-bold mb-1">Important Non-Affiliation Notice</p>
            Nexora is an independent student-led academic initiative. It is <strong>NOT</strong> an official portal of, affiliated with, endorsed by, or operated by Ballari Institute of Technology and Management (BITM) or Visvesvaraya Technological University (VTU). All institutional names and curriculum codes are used strictly for informational identification.
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">1. Educational Fair-Use Policy</h2>
            <p>
              Nexora operates as an open academic repository created exclusively to facilitate peer-to-peer study and exam revision among undergraduate engineering students.
            </p>
            <p className="mt-2">
              All question papers, handwritten lecture notes, lab manuals, and syllabus materials cataloged on this platform are hosted and shared pursuant to <strong>Section 52(1)(a) and Section 52(1)(i) of the Indian Copyright Act, 1957</strong>, which explicitly permits the fair dealing and reproduction of work for non-commercial private study, research, and educational instructional purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">2. Contributor Guidelines & Ownership</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Students contributing study materials must only submit links to educational notes, syllabus outlines, or previous question papers.</li>
              <li>Contributors must not upload commercially published paid textbooks, copyrighted commercial test-series keys, or confidential exam papers prior to official university administration.</li>
              <li>By submitting a resource link, you confirm that the material is shared for free student learning and that you grant Nexora a non-exclusive license to catalog and index it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">3. Copyright Infringement & Takedown Procedure (DMCA / Fair Dealing)</h2>
            <p>
              We respect the intellectual property rights of educators, faculty members, and authors. If you are a copyright owner or an authorized representative and believe that any material indexed on Nexora infringes upon your copyright:
            </p>
            <div className="mt-3 rounded-2xl bg-[hsl(var(--muted)/.4)] p-4 border border-[hsl(var(--border)/.5)] text-xs space-y-2">
              <p className="font-semibold text-[hsl(var(--foreground))]">How to request immediate removal:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Submit a takedown notice via the in-app <strong>Report Resource</strong> button on the resource card, or email us at <code>copyright@nexora.app</code>.</li>
                <li>Identify the specific resource URL or title on Nexora.</li>
                <li>Provide proof of authorship or institutional ownership.</li>
              </ol>
              <p className="text-[hsl(var(--foreground))] font-medium pt-1">
                <CheckCircle2 size={13} className="inline mr-1 text-emerald-500" />
                We review and process all verified takedown notices within 24 to 48 hours.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">4. Disclaimer of Warranties & Accuracy</h2>
            <p>
              While student volunteers and admins review cataloged resources, all materials and AI answers are provided &quot;as is&quot; for study assistance. Students should cross-verify module numbers, formulas, and autonomous scheme guidelines with official college notices and syllabus circulars. Nexora is not responsible for academic grade variations or curriculum changes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">5. Updates to Terms</h2>
            <p>
              We may revise these Terms to maintain compliance with applicable educational guidelines and technology laws. Continued use of Nexora signifies your agreement to the current policies.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
