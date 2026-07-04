import { MarketingFooter } from "@/components/MarketingFooter";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300 mb-10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-2 text-xs text-slate-500">Last updated: July 1, 2026</p>

        <div className="mt-10 space-y-8 text-sm text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. Data Controller</h2>
            <p>
              CoreVita (hereinafter &ldquo;CoreVita,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) is the data controller for the processing of personal data in connection with the operation of the CoreVita platform. Contact: zriguiadam@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. Types of Data We Process</h2>
            <p>We process the following categories of personal data:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> name, email address, profile picture, professional role</li>
              <li><strong>Usage data:</strong> login activity, studies uploaded, features used</li>
              <li><strong>Billing data:</strong> payment method details (processed via Stripe, we do not store full payment credentials)</li>
              <li><strong>Medical data:</strong> DICOM images and metadata you upload (processed on your behalf as a data processor)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. Legal Basis for Processing (GDPR Art. 6)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account management:</strong> performance of a contract (Art. 6(1)(b))</li>
              <li><strong>Medical data processing:</strong> our legitimate interest in providing the service, and your responsibility as a healthcare provider (Art. 6(1)(f), Art. 9(2)(h))</li>
              <li><strong>Billing:</strong> performance of a contract and legal obligation (Art. 6(1)(b), Art. 6(1)(c))</li>
              <li><strong>Analytics &amp; improvement:</strong> legitimate interest (Art. 6(1)(f))</li>
              <li><strong>Consent-based processing:</strong> where you have given explicit consent (Art. 6(1)(a))</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. Data Processing for Medical Images</h2>
            <p>
              When you upload DICOM images, we act as a data processor on your behalf. You remain the data controller for the patient data contained in those images. We process this data solely to provide the service: storage, viewing, and sharing via secure links. We do not use medical images for any other purpose, including training AI models, without your explicit, separate consent.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. Data Sharing</h2>
            <p>We share your data only with:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Stripe</strong> (payment processing &mdash; see their privacy policy at stripe.com/privacy)</li>
              <li><strong>Backblaze</strong> (cloud storage of DICOM files &mdash; SOC 2 certified)</li>
              <li><strong>Firebase / Google Cloud</strong> (authentication and hosting &mdash; GDPR-compliant DPA in place)</li>
              <li><strong>Authorized recipients you designate</strong> when you share studies via secure links</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. Data Retention</h2>
            <p>
              Account data is retained for the duration of your account. Medical images are retained as described in Section 7 of our Terms of Service (active subscription duration plus 30-day grace period). Billing records are retained for the duration required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. Your Rights (GDPR)</h2>
            <p>You have the following rights regarding your personal data:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Right of access</strong> (Art. 15) &mdash; request a copy of your data</li>
              <li><strong>Right to rectification</strong> (Art. 16) &mdash; correct inaccurate data</li>
              <li><strong>Right to erasure</strong> (Art. 17) &mdash; request deletion of your data</li>
              <li><strong>Right to restrict processing</strong> (Art. 18)</li>
              <li><strong>Right to data portability</strong> (Art. 20) &mdash; receive your data in a machine-readable format</li>
              <li><strong>Right to object</strong> (Art. 21) &mdash; object to processing based on legitimate interest</li>
              <li><strong>Right to withdraw consent</strong> where processing is based on consent</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at zriguiadam@gmail.com. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures, including encryption in transit (TLS 1.3) and at rest (AES-256), access controls, regular security audits, and staff training on data protection.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">9. International Data Transfers</h2>
            <p>
              Data may be processed on servers within the European Economic Area (EEA) and in the United States. For transfers to the US, we rely on the EU-US Data Privacy Framework and Standard Contractual Clauses as appropriate.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">10. Complaints</h2>
            <p>
              If you believe we have violated your data protection rights, you have the right to lodge a complaint with your local data protection supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">11. Changes to This Policy</h2>
            <p>
              We will notify you of material changes via email or through the Platform. The date of the latest revision is shown at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">12. Contact</h2>
            <p>
              For privacy-related inquiries: zriguiadam@gmail.com
            </p>
          </section>
        </div>
      </div>
      <MarketingFooter />
    </main>
  );
}
