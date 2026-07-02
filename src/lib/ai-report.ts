const AI_REPORT_URL = process.env.AI_REPORT_URL || "";
const AI_REPORT_API_KEY = process.env.AI_REPORT_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

type AiReportContext = {
  patientName?: string | null;
  modality?: string | null;
  description?: string | null;
  studyDate?: string | null;
  series?: { modality?: string | null; instanceCount: number }[];
};

type AiReportResult = {
  content: string;
};

const PROMPT = `You are a board-certified radiologist. Generate a structured radiology report based on the study metadata below.

Use this format:
**CLINICAL HISTORY:** (leave as "Not provided" if no info)
**TECHNIQUE:** (describe based on modality)
**FINDINGS:** (describe normal findings for the given modality, noting any relevant details)
**IMPRESSION:** (provide a summary impression)

Study:
- Patient: {patientName}
- Modality: {modality}
- Description: {description}
- Study Date: {studyDate}
- Series: {seriesList}

Write the report in clear medical language.`;

function buildPrompt(ctx: AiReportContext): string {
  const seriesList = (ctx.series || [])
    .map((s) => `  - ${s.modality || "Unknown"} (${s.instanceCount} images)`)
    .join("\n");

  return PROMPT
    .replace("{patientName}", ctx.patientName || "Anonymous")
    .replace("{modality}", ctx.modality || "Unknown")
    .replace("{description}", ctx.description || "Not provided")
    .replace("{studyDate}", ctx.studyDate || "Not provided")
    .replace("{seriesList}", seriesList || "  - None");
}

async function generateWithGemini(ctx: AiReportContext): Promise<AiReportResult> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = buildPrompt(ctx);
  const result = await model.generateContent(prompt);
  const content = result.response.text();
  if (!content) throw new Error("Gemini returned empty content");
  return { content };
}

async function generateWithExternalUrl(studyId: string, tenantId: string): Promise<AiReportResult> {
  const response = await fetch(AI_REPORT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_REPORT_API_KEY}`,
    },
    body: JSON.stringify({ studyId, tenantId }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`AI Report service returned ${response.status}: ${body}`);
  }

  const data = await response.json();
  return { content: data.content || data.report || "" };
}

export async function generateAiReport(
  studyId: string,
  tenantId: string,
  context?: AiReportContext,
): Promise<AiReportResult> {
  if (GEMINI_API_KEY) {
    if (!context) throw new Error("Study context is required for Gemini report generation");
    return generateWithGemini(context);
  }

  if (AI_REPORT_URL && AI_REPORT_API_KEY) {
    return generateWithExternalUrl(studyId, tenantId);
  }

  throw new Error(
    "AI Report service not configured. Set GEMINI_API_KEY or both AI_REPORT_URL and AI_REPORT_API_KEY.",
  );
}
