import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, FileText, Mail, Shield } from "lucide-react";

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
            <p className="font-semibold text-[hsl(var(--foreground))] mb-1">Overview</p>
            Nexora is an unofficial academic repository maintained by the developer for students. Personal data is never sold, browsing notes requires no account creation, and AI assistant conversations are ephemeral (never stored in the database).
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">1. Scope and Administration</h2>
            <p>
              Nexora is operated and maintained by the developer. This Privacy Policy outlines the standards applied for handling and protecting information in accordance with the <strong>Digital Personal Data Protection Act (DPDP Act 2023)</strong> and the <strong>Information Technology Rules, 2011</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">2. Data Handled by the Platform</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Public Browsing & Traffic Stats:</strong> General usage statistics (such as paths visited and device category) are tracked to ensure reliability. To protect student privacy, visitor IP addresses are <em>cryptographically hashed using SHA-256</em> and truncated before storage. Raw IP addresses are never saved to the database.
              </li>
              <li>
                <strong>Resource Submissions:</strong> When contributing study materials or notes, students may optionally include a name and email for contributor attribution. This information is used solely to display credit and verify file authenticity.
              </li>
              <li>
                <strong>Campus Trade Classifieds:</strong> When listing an item for sale (e.g., used textbooks, calculators, lab coats, handwritten notes), information provided by the seller—including item description, asking price, item photo, campus pickup location, seller name, WhatsApp contact number, and optional Instagram handle—is publicly displayed on the platform so interested buyers can initiate direct contact. Uploaded images are compressed client-side before submission. The developer does not observe, log, or store private communications or financial transactions conducted between buyers and sellers outside the platform.
              </li>
              <li>
                <strong>Feedback Submissions:</strong> Information submitted through the feedback dialog is utilized strictly by the developer to fix reported bugs and improve catalog features.
              </li>
              <li>
                <strong>AI Academic Assistant:</strong> Conversations with the AI assistant are held only in temporary browser memory during the active session. The developer does not log or store chat prompts or student queries in the database.
              </li>
              <li>
                <strong>Voluntary Donations:</strong> Contributions made through &quot;Buy Me Paneer&quot; are processed directly by <strong>Razorpay</strong>, an authorized, PCI-DSS Level 1 certified payment gateway. The platform does not collect, handle, or store card numbers, UPI PINs, or bank credentials.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">3. Cookies and Advertising</h2>
            <p>
              Nexora uses standard first-party session cookies necessary for website navigation and CSRF security. Google AdSense is included to help offset server and database hosting costs. Third-party vendors, including Google, use cookies to display ads based on prior visits. Visitors can manage or disable personalized ad cookies through{" "}
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
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">4. Security Safeguards</h2>
            <p>
              All communication between the browser and the server is encrypted using Transport Layer Security (TLS / HTTPS). The database utilizes parameterized queries to prevent injection attacks, and administrative access is secured through salt-hashed credentials and signed HTTP-only cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">5. Data Deletion and Correction Rights</h2>
            <p>
              In line with the DPDP Act 2023, any student has the right to request access to their submitted information, request corrections, or ask for the immediate removal (erasure) of any contributed notes, feedback, or classifieds listings.
            </p>
            <p className="mt-2">
              For <strong>Campus Trade</strong> listings, sellers can mark an item as sold or permanently delete the listing and its associated image at any time using the secret deletion passkey created at listing time. If a passkey is lost, the developer will delete the listing upon receiving a brief verification request.
            </p>
          </section>

          <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <h3 className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail size={14} className="text-[hsl(var(--secondary))]" /> Contact the Developer
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              For any data removal requests or privacy inquiries, submit a message via the in-app Feedback dialog on the site or send an email to <a href="mailto:bkeshava636@gmail.com" className="font-semibold text-[hsl(var(--primary))] hover:underline">bkeshava636@gmail.com</a>. Requests are reviewed and handled directly by the developer.
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
              Terms of Use, Educational Fair Dealing & Takedown Policy
            </p>
          </div>
        </div>

        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-[hsl(var(--muted-foreground))] space-y-6">
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
            <p className="font-bold mb-1">Non-Affiliation Notice</p>
            Nexora is an unofficial academic study repository maintained by the developer. It is <strong>NOT</strong> an official portal of, affiliated with, endorsed by, or operated by Ballari Institute of Technology and Management (BITM) or Visvesvaraya Technological University (VTU). All institutional names and curriculum codes are used strictly for reference and identification.
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">1. Educational Fair-Use Policy</h2>
            <p>
              Nexora operates as an open academic index created to assist students with exam revision and study materials.
            </p>
            <p className="mt-2">
              All question papers, handwritten lecture notes, lab manuals, and syllabus materials cataloged on the platform are shared in accordance with <strong>Section 52(1)(a) and Section 52(1)(i) of the Indian Copyright Act, 1957</strong>, which permits the fair dealing and reproduction of educational materials for non-commercial private study, research, and revision.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">2. Contributor Guidelines</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Submissions should be limited to non-commercial educational notes, syllabus references, and past examination papers.</li>
              <li>Contributors must not submit commercially published paid textbooks, copyrighted test-series solutions, or unauthorized examination keys.</li>
              <li>By submitting a resource link, the contributor confirms that the material is freely accessible for student revision and grants Nexora permission to index and catalog it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">3. Copyright Takedown Procedure</h2>
            <p>
              The developer respects the intellectual property rights of teachers, faculty members, and copyright holders. If any content indexed on Nexora infringes upon a copyright:
            </p>
            <div className="mt-3 rounded-2xl bg-[hsl(var(--muted)/.4)] p-4 border border-[hsl(var(--border)/.5)] text-xs space-y-2">
              <p className="font-semibold text-[hsl(var(--foreground))]">How to request removal:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Submit a request using the in-app <strong>Report Resource</strong> button, send a note via the Feedback dialog, or email <a href="mailto:bkeshava636@gmail.com" className="font-semibold text-[hsl(var(--primary))] hover:underline">bkeshava636@gmail.com</a>.</li>
                <li>Specify the exact resource title or page path.</li>
                <li>Include verifiable information showing ownership or authorship.</li>
              </ol>
              <p className="text-[hsl(var(--foreground))] font-medium pt-1">
                <CheckCircle2 size={13} className="inline mr-1 text-emerald-500" />
                The developer reviews and processes verified removal requests within 24 to 48 hours.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">4. Campus Trade — Intermediary Safe Harbor & Student Trading Rules</h2>
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-900 dark:text-red-200 mb-3">
              <p className="font-bold mb-1">Notice of Intermediary Status & Zero Financial Liability</p>
              Campus Trade is an unmonetized, student-to-student notice board provided solely for campus convenience. The developer is <strong>NOT</strong> a seller, buyer, broker, retailer, payment processor, escrow agent, or party to any contract or exchange. The developer assumes <strong>ABSOLUTELY NO RESPONSIBILITY OR LIABILITY</strong> for any transactions, goods, payments, or interactions between users.
            </div>
            <ul className="list-disc pl-5 space-y-2 text-xs">
              <li>
                <strong>Intermediary Protection under IT Act 2000 (Section 79):</strong> Nexora functions purely as an intermediary facilitating peer-to-peer communication. The developer does not initiate transmission, select recipients, or modify listed information submitted by users.
              </li>
              <li>
                <strong>No Handling of Funds:</strong> The platform does not handle payments, take transaction fees or commissions, or provide escrow protection. All financial arrangements (cash, UPI) take place directly between students outside the platform.
              </li>
              <li>
                <strong>Disclaimer of Condition and Authenticity:</strong> All items listed (textbooks, calculators, lab coats, components, notes) are listed &quot;as is, where is&quot; by third-party student users. The developer does not inspect, test, sanitize, verify, or guarantee any item&apos;s physical condition, functionality, edition, authenticity, or safety.
              </li>
              <li>
                <strong>Limitation of Liability:</strong> Under no circumstances shall the developer be liable for any direct, indirect, incidental, punitive, or consequential damages resulting from scams, fraud, non-payment, defective equipment, misrepresentation, missed meetings, disputes, or physical injuries occurring before, during, or after a transaction.
              </li>
              <li>
                <strong>Prohibited Items:</strong> Users are strictly prohibited from posting, selling, or soliciting:
                <ul className="list-circle pl-5 mt-1 space-y-1">
                  <li>Live, confidential, or leaked academic examination question papers, test solutions, or grading rubrics;</li>
                  <li>Academic ghostwriting, assignment fabrication, or examination impersonation services;</li>
                  <li>Prescription drugs, tobacco, nicotine, alcohol, firearms, fireworks, or hazardous chemicals;</li>
                  <li>Stolen property, pirated textbooks/software license keys, counterfeit items, or illegal substances;</li>
                  <li>Harassing, defamatory, obscene, or fraudulent listings.</li>
                </ul>
              </li>
              <li>
                <strong>Campus Meeting Safety Guidelines:</strong> Buyers and sellers are strongly advised to meet strictly during daylight hours in busy, public campus areas (e.g., college library entrance, student food court, academic foyer). Always inspect the physical condition of goods thoroughly before transferring money. Never send advance deposits to strangers.
              </li>
              <li>
                <strong>Indemnification:</strong> By creating or replying to a listing on Campus Trade, each user explicitly agrees to defend, indemnify, and hold harmless the developer against any claims, losses, damages, liabilities, and legal costs arising from their listing, conduct, transactions, or breach of these terms.
              </li>
              <li>
                <strong>Takedown of Infringing Listings:</strong> The developer reserves the right to immediately remove any listing, ban any contact information, or report fraudulent behavior to campus authorities upon receiving notice or evidence of violation.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">5. Disclaimer of Warranties</h2>
            <p>
              While cataloged materials are reviewed for basic relevance, all resources and AI assistant responses are provided &quot;as is&quot; for study reference. Students should cross-verify specific module contents, formulas, and autonomous scheme guidelines with official institutional notices and academic circulars.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] mb-2">6. Updates to Terms</h2>
            <p>
              These Terms may be updated periodically to maintain compliance with applicable educational guidelines and technology laws.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
