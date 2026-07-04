import Busboy from "busboy";
import { Readable } from "stream";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const bb = Busboy({ headers: { "content-type": contentType } } as any);
  let files = 0;

  const finished = new Promise<void>((resolve, reject) => {
    bb.on("file", (_name, stream) => {
      files++;
      stream.on("data", () => {});
      stream.on("end", () => {});
    });
    bb.on("finish", () => resolve());
    bb.on("error", (e) => reject(e));
  });

  const webBody = (req as any).body as ReadableStream | undefined;
  if (!webBody) return new Response(JSON.stringify({ error: "No body" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const nodeStream = Readable.fromWeb(webBody as any);
  await new Promise<void>((resolve, reject) => {
    nodeStream.on("error", reject);
    bb.on("error", reject);
    nodeStream.pipe(bb as any);
    bb.on("finish", () => resolve());
  });

  await finished;
  return new Response(JSON.stringify({ ok: true, files }), { status: 200, headers: { "Content-Type": "application/json" } });
}
