import { MarketingFooter } from "@/components/MarketingFooter";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-static";

export default function TermsPage() {
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

        <h1 className="text-2xl font-semibold tracking-tight text-white">Terms of Service</h1>
        <p className="mt-2 text-xs text-slate-500">Last updated: July 1, 2026</p>

        <div className="mt-10 space-y-8 text-sm text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using CoreVita (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              CoreVita provides a cloud-based platform for uploading, viewing, and sharing medical DICOM images via secure links. The Platform is intended for use by licensed healthcare professionals and authorized personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. Eligibility</h2>
            <p>
              You must be at least 18 years old and authorized to access medical data in your jurisdiction. By registering, you represent that you are a healthcare professional, or acting on behalf of one, with legitimate need to use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. Account Registration</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate, complete, and up-to-date registration information. You are liable for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Upload or share images without proper patient consent or legal authorization</li>
              <li>Use the Platform for any unlawful purpose</li>
              <li>Attempt to access another user&apos;s data without authorization</li>
              <li>Reverse-engineer, decompile, or tamper with the Platform</li>
              <li>Use automated scripts or bots to interact with the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. Data Protection &amp; GDPR</h2>
            <p>
              CoreVita processes personal data in accordance with the General Data Protection Regulation (GDPR) and the German Patientendaten-Schutz-Gesetz (PDSG). As a data processor, we implement appropriate technical and organizational measures to protect your data. You, as the data controller, are responsible for ensuring that you have a lawful basis for processing patient data through the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. Data Retention &amp; Deletion</h2>
            <p>
              Uploaded studies are retained for the duration of your active subscription. Upon cancellation or expiration, you have 30 days to export your data. After this period, all data is permanently deleted from our systems, including backups, unless legal retention obligations require otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. Subscriptions &amp; Billing</h2>
            <p>
              Paid plans are billed monthly in advance. All fees are non-refundable except as required by law. We reserve the right to change pricing with 30 days&apos; notice. Downgrading your plan may result in loss of access to certain features and reduced storage capacity.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p>
              CoreVita is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for any damages arising from the use or inability to use the Platform, including but not limited to misdiagnosis, delayed treatment, or data loss. The Platform is a supplementary tool and does not replace professional medical judgment.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">10. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms, with or without notice. You may terminate your account at any time through the settings page.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">11. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated via email or through the Platform. Continued use after changes take effect constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Federal Republic of Germany. Any disputes shall be resolved in the courts of Berlin, Germany.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">13. Contact</h2>
            <p>
              For questions about these Terms, contact us at legal@corevita.com.
            </p>
          </section>
        </div>
      </div>
      <MarketingFooter />
    </main>
  );
}
