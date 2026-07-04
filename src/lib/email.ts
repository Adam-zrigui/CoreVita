import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(apiKey);
  }
  return _resend;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://corevita.vercel.app";
}

export async function sendTeamInviteEmail(params: {
  email: string;
  inviterName: string;
  tenantName: string;
  tenantSlug: string;
}): Promise<void> {
  const { email, inviterName, tenantName, tenantSlug } = params;
  const joinUrl = `${getAppUrl()}/join/${encodeURIComponent(tenantSlug)}`;

  await getResend().emails.send({
    from: "CoreVita <noreply@corevita.app>",
    to: email,
    subject: `${inviterName} invited you to join ${tenantName} on CoreVita`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px;background:#f9fafb">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
            <h2 style="margin-top:0;color:#111827">You're invited!</h2>
            <p style="color:#4b5563;line-height:1.6">
              <strong>${inviterName}</strong> has invited you to join
              <strong>${tenantName}</strong> on CoreVita.
            </p>
            <a href="${joinUrl}"
               style="display:inline-block;margin:24px 0;padding:12px 24px;border-radius:8px;background:#10b981;color:#fff;text-decoration:none;font-weight:600">
              Accept invitation
            </a>
            <p style="color:#9ca3af;font-size:13px;margin-top:24px">
              If you weren't expecting this, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendStudyReportEmail(params: {
  email: string;
  studyTitle: string;
  studyDate?: string | null;
  patientName?: string | null;
  studyUid: string;
}): Promise<void> {
  const { email, studyTitle, studyDate, patientName, studyUid } = params;
  const studyUrl = `${getAppUrl()}/studies/${encodeURIComponent(studyUid)}`;

  await getResend().emails.send({
    from: "CoreVita <noreply@corevita.app>",
    to: email,
    subject: `Report ready: ${studyTitle ?? patientName ?? "Study"}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px;background:#f9fafb">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
            <h2 style="margin-top:0;color:#111827;font-size:18px">Report ready</h2>
            <p style="color:#4b5563;line-height:1.6">
              A report has been completed for
              <strong>${studyTitle ?? patientName ?? "a study"}</strong>
              ${studyDate ? `from <strong>${studyDate}</strong>` : ""}.
            </p>
            <a href="${studyUrl}"
               style="display:inline-block;margin:24px 0;padding:12px 24px;border-radius:8px;background:#10b981;color:#fff;text-decoration:none;font-weight:600">
              View study
            </a>
            <p style="color:#9ca3af;font-size:13px;margin-top:24px">
              Stay up to date with your studies on <a href="${getAppUrl()}" style="color:#10b981;text-decoration:none">CoreVita</a>.
            </p>
          </div>
        </body>
      </html>
    `,
  });
}
