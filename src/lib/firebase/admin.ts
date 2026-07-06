import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let _adminAuth: ReturnType<typeof getAuth> | null = null;

export function getAdminAuth() {
  if (_adminAuth) return _adminAuth;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!projectId || !clientEmail || !privateKey) {
    console.error("[admin] Missing Firebase Admin env vars", { hasProjectId: !!projectId, hasClientEmail: !!clientEmail, hasPrivateKey: !!privateKey, privateKeyPrefix: privateKey?.slice(0, 30) });
    return null;
  }

  const apps = getApps();
  if (!apps.length) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey,
        }),
      });
    } catch (e) {
      console.error("[admin] initializeApp/cert failed:", e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  _adminAuth = getAuth();
  return _adminAuth;
}
