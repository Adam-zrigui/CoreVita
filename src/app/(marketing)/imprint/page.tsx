import { MarketingFooter } from "@/components/MarketingFooter";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-static";

export default function ImprintPage() {
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

        <h1 className="text-2xl font-semibold tracking-tight text-white">Imprint</h1>
        <p className="mt-2 text-xs text-slate-500">Angaben gemäß § 5 TMG</p>

        <div className="mt-10 space-y-8 text-sm text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-3">Company Information</h2>
            <p className="text-slate-300">
              CoreVita GmbH
            </p>
            <p>
              Musterstraße 123<br />
              10115 Berlin<br />
              Germany
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Commercial Register</h2>
            <p>
              Registered at: Amtsgericht Berlin-Charlottenburg<br />
              Registration number: HRB 123456
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Represented by</h2>
            <p>
              Managing Director: John Doe
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Contact</h2>
            <p>
              Email: hello@corevita.com<br />
              Phone: +49 30 12345678
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">VAT ID</h2>
            <p>
              VAT identification number according to § 27a UStG: DE123456789
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Professional Information</h2>
            <p>
              CoreVita provides software-as-a-service for medical image management. The platform is not a medical device and does not provide diagnostic recommendations. All medical decisions remain the sole responsibility of licensed healthcare professionals.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Disclaimer</h2>
            <h3 className="text-sm font-semibold text-slate-300 mt-4 mb-2">Liability for Content</h3>
            <p>
              As a service provider, we are responsible for our own content on these pages under general law. We are not obliged to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.
            </p>
            <h3 className="text-sm font-semibold text-slate-300 mt-4 mb-2">Liability for Links</h3>
            <p>
              Our service may contain links to external third-party websites over whose content we have no control. We cannot assume any liability for this external content.
            </p>
            <h3 className="text-sm font-semibold text-slate-300 mt-4 mb-2">Copyright</h3>
            <p>
              The content and works created by the site operators on these pages are subject to German copyright law. Duplication, processing, distribution, or any form of commercialization of such material beyond the scope of the copyright law requires the prior written consent of its respective author or creator.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Dispute Resolution</h2>
            <p>
              The European Commission provides a platform for online dispute resolution (OS): <a href="https://ec.europa.eu/consumers/odr/" className="text-blue-400 hover:text-blue-300 transition-colors" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr/</a>.<br />
              We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
          </section>
        </div>
      </div>
      <MarketingFooter />
    </main>
  );
}
