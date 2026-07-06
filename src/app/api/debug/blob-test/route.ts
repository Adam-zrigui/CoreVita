import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, unknown> = {};

  results.driver = process.env.DICOM_STORAGE_DRIVER?.trim();
  results.hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  results.tokenPrefix = process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 30);
  results.tokenLength = process.env.BLOB_READ_WRITE_TOKEN?.length;

  try {
    const vb = await import("@vercel/blob");
    results.sdkLoaded = true;
    results.sdkExports = Object.keys(vb);

    // Test 1: Basic put/get
    const testKey = `test-${Date.now()}.bin`;
    const testBody = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const putResult = await vb.put(testKey, testBody, {
      access: "public",
      contentType: "application/octet-stream",
      addRandomSuffix: false,
    });
    results.putUrl = putResult.url;
    results.putPathname = putResult.pathname;

    const getResult = await vb.get(testKey, { access: "public" });
    results.getStatus = getResult?.statusCode;
    results.getHasStream = !!getResult?.stream;
    const reader = getResult?.stream?.getReader();
    let bytesRead = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.length;
      }
    }
    results.getBytesRead = bytesRead;

    await vb.del(testKey);
    results.deleteOk = true;

    // Test 2: issueSignedToken + presignUrl
    const presignKey = `presign-test-${Date.now()}.bin`;
    const signedToken = await vb.issueSignedToken({
      pathname: presignKey,
      operations: ["put"],
      validUntil: Date.now() + 3600 * 1000,
    });
    results.signedTokenType = typeof signedToken;
    results.signedTokenKeys = Object.keys(signedToken);

    const { presignedUrl } = await vb.presignUrl(signedToken, {
      operation: "put",
      pathname: presignKey,
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    results.presignedUrlPrefix = presignedUrl?.slice(0, 60);

    // Actually upload via the presigned URL
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/dicom" },
      body: new Uint8Array([1, 2, 3, 4, 5]),
    });
    results.presignUploadStatus = uploadResponse.status;
    results.presignUploadOk = uploadResponse.ok;

    // Now try to get it back
    const getPresigned = await vb.get(presignKey, { access: "public" });
    results.getPresignedStatus = getPresigned?.statusCode;
    results.getPresignedSize = getPresigned?.blob?.size;

    // Cleanup
    await vb.del(presignKey);
    results.presignCleanupOk = true;
  } catch (err) {
    results.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    if (err instanceof Error && err.stack) {
      results.stack = err.stack.split("\n").slice(0, 5).join("\n");
    }
  }

  return NextResponse.json(results);
}
