"use client";

import { FirebaseError } from "firebase/app";
import { useState, useEffect } from "react";

type FirebaseSession = {
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    phoneNumber: string | null;
    metadata: {
      creationTime?: string;
      lastSignInTime?: string;
    };
  };
  token: Promise<string>;
};

let _auth: any = null;

async function getFirebaseAuth() {
  if (_auth) return _auth;
  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getAuth } = await import("firebase/auth");
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
    };
    const apps = getApps();
    const app = apps.length ? apps[0] : initializeApp(firebaseConfig);
    _auth = getAuth(app);
  } catch {
    _auth = null;
  }
  return _auth;
}

export const sendVerificationEmail = async () => {
  const { sendEmailVerification } = await import("firebase/auth");
  const fbAuth = await getFirebaseAuth();
  if (!fbAuth) throw new Error("Firebase auth not available");
  const user = fbAuth.currentUser;
  if (!user) throw new Error("No authenticated user");
  await sendEmailVerification(user);
};

export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
    const fbAuth = await getFirebaseAuth();
    if (!fbAuth) throw new Error("Firebase auth not available");
    const cred = await createUserWithEmailAndPassword(fbAuth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    return cred.user;
  } catch (error) {
    const authError = error instanceof FirebaseError ? error : null;
    console.error("[firebase] Sign-up error:", {
      code: authError?.code,
      message: authError?.message,
    });
    if (authError?.code === "auth/email-already-in-use") {
      throw new Error("An account with this email already exists.");
    }
    if (authError?.code === "auth/weak-password") {
      throw new Error("Password must be at least 6 characters.");
    }
    if (authError?.code === "auth/invalid-email") {
      throw new Error("Please enter a valid email address.");
    }
    throw new Error(`Sign-up failed [${authError?.code ?? "unknown"}]: ${authError?.message ?? "Unknown error"}`);
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const fbAuth = await getFirebaseAuth();
    if (!fbAuth) throw new Error("Firebase auth not available");
    const cred = await signInWithEmailAndPassword(fbAuth, email, password);
    return cred.user;
  } catch (error) {
    const authError = error instanceof FirebaseError ? error : null;
    console.error("[firebase] Email sign-in error:", {
      code: authError?.code,
      message: authError?.message,
    });
    if (authError?.code === "auth/user-not-found" || authError?.code === "auth/wrong-password" || authError?.code === "auth/invalid-credential") {
      throw new Error("Invalid email or password.");
    }
    if (authError?.code === "auth/invalid-email") {
      throw new Error("Please enter a valid email address.");
    }
    if (authError?.code === "auth/too-many-requests") {
      throw new Error("Too many attempts. Please try again later.");
    }
    throw new Error(`Sign-in failed [${authError?.code ?? "unknown"}]: ${authError?.message ?? "Unknown error"}`);
  }
};

export const resetPassword = async (email: string) => {
  try {
    const { sendPasswordResetEmail } = await import("firebase/auth");
    const fbAuth = await getFirebaseAuth();
    if (!fbAuth) throw new Error("Firebase auth not available");
    await sendPasswordResetEmail(fbAuth, email);
  } catch (error) {
    const authError = error instanceof FirebaseError ? error : null;
    console.error("[firebase] Password reset error:", {
      code: authError?.code,
      message: authError?.message,
    });
    if (authError?.code === "auth/user-not-found") {
      throw new Error("No account found with this email.");
    }
    if (authError?.code === "auth/invalid-email") {
      throw new Error("Please enter a valid email address.");
    }
    throw new Error(`Password reset failed [${authError?.code ?? "unknown"}]: ${authError?.message ?? "Unknown error"}`);
  }
};

export const signIn = async (provider: any) => {
  const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = await import("firebase/auth");
  const fbAuth = await getFirebaseAuth();
  if (!fbAuth) throw new Error("Firebase auth not available");
  try {
    if (provider === "google") {
      const result = await signInWithPopup(fbAuth, new GoogleAuthProvider());
      return result.user;
    }
    await signInWithRedirect(fbAuth, provider);
  } catch (error) {
    const authError = error instanceof FirebaseError ? error : null;
    if (authError?.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in was cancelled. Please try again.");
    }
    if (authError?.code === "auth/popup-blocked") {
      await signInWithRedirect(fbAuth, new GoogleAuthProvider());
      throw new Error("Popup was blocked. Redirecting to Google sign-in...");
    }
    console.error("[firebase] Full sign-in error:", {
      code: authError?.code,
      message: authError?.message,
      customData: authError?.customData,
      stack: authError?.stack,
    });
    throw new Error(`Authentication failed [${authError?.code ?? "unknown"}]: ${authError?.message ?? "Unknown error"}`);
  }
};

export const signOut = async () => {
  try {
    await fetch("/api/auth/session", {
      method: "DELETE",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // best-effort; cookie may remain but will be overwritten on next login
  }
  const signOutModule = await import("firebase/auth");
  const fbAuth = await getFirebaseAuth();
  if (fbAuth) await signOutModule.signOut(fbAuth);
  window.location.href = "/login";
};

export const useSession = () => {
  const [session, setSession] = useState<FirebaseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { onAuthStateChanged } = await import("firebase/auth");
        const fbAuth = await getFirebaseAuth();
        if (!fbAuth || !mounted) {
          if (mounted) setLoading(false);
          return;
        }
        onAuthStateChanged(fbAuth, (user: any) => {
          if (!mounted) return;
          if (user) {
            setSession({
              user: {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                phoneNumber: user.phoneNumber,
                metadata: {
                  creationTime: user.metadata.creationTime,
                  lastSignInTime: user.metadata.lastSignInTime,
                },
              },
              token: user.getIdToken(),
            });
          } else {
            setSession(null);
          }
          setLoading(false);
        });
      } catch {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { session, loading, error };
};

export const getIdToken = async () => {
  const fbAuth = await getFirebaseAuth();
  if (!fbAuth) throw new Error("Firebase auth not available");
  const user = fbAuth.currentUser;
  if (!user) throw new Error("No authenticated user");
  return user.getIdToken();
};

export const getCurrentUser = async () => {
  const fbAuth = await getFirebaseAuth();
  return fbAuth?.currentUser ?? null;
};

export const isAuthenticated = async () => {
  const fbAuth = await getFirebaseAuth();
  return !!fbAuth?.currentUser;
};

export const onAuthStateChanged = (callback: (user: any) => void) => {
  let unsub: (() => void) | null = null;
  (async () => {
    const authModule = await import("firebase/auth");
    const fbAuth = await getFirebaseAuth();
    if (!fbAuth) {
      callback(null);
      return;
    }
    unsub = authModule.onAuthStateChanged(fbAuth, callback);
  })();
  return () => { unsub?.(); };
};

export const signInWithRedirect = async (provider: any) => {
  const { signInWithRedirect } = await import("firebase/auth");
  const fbAuth = await getFirebaseAuth();
  if (!fbAuth) throw new Error("Firebase auth not available");
  await signInWithRedirect(fbAuth, provider);
};

export const signInWithCustomToken = async (token: string) => {
  const { signInWithCustomToken } = await import("firebase/auth");
  const fbAuth = await getFirebaseAuth();
  if (!fbAuth) throw new Error("Firebase auth not available");
  return signInWithCustomToken(fbAuth, token);
};

export const GoogleAuthProvider = "google" as any;
