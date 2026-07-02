"use client";

import { FirebaseError, initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect as fbSignInRedirect,
  signInWithCustomToken as fbSignInWithCustomToken,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  createUserWithEmailAndPassword as fbCreateUser,
  signInWithEmailAndPassword as fbSignInEmail,
  sendPasswordResetEmail as fbSendPasswordReset,
  sendEmailVerification as fbSendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  type User,
  type AuthProvider,
} from "firebase/auth";
import { useState, useEffect } from "react";

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
const auth = getAuth(app);

export { auth, GoogleAuthProvider, fbSignInRedirect as signInWithRedirect, fbSignInWithCustomToken as signInWithCustomToken, updateProfile };

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
  role: "ADMIN" | "RADIOLOGIST" | "VIEWER";
};

export const sendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  await fbSendEmailVerification(user);
};

export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const cred = await fbCreateUser(auth, email, password);
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
    const cred = await fbSignInEmail(auth, email, password);
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
    await fbSendPasswordReset(auth, email);
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

export const signIn = async (provider: AuthProvider | typeof GoogleAuthProvider) => {
  try {
    if (provider === GoogleAuthProvider) {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      return result.user;
    }
    await fbSignInRedirect(auth, provider as AuthProvider);
  } catch (error) {
    const authError = error instanceof FirebaseError ? error : null;
    if (authError?.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in was cancelled. Please try again.");
    }
    if (authError?.code === "auth/popup-blocked") {
      await fbSignInRedirect(auth, new GoogleAuthProvider());
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
  await fbSignOut(auth);
  window.location.href = "/login";
};

export const useSession = () => {
  const [session, setSession] = useState<FirebaseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsub = fbOnAuthStateChanged(
      auth,
      (user) => {
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
            role: "VIEWER",
          });
        } else {
          setSession(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { session, loading, error };
};

export const getIdToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  return user.getIdToken();
};

export const getCurrentUser = () => auth.currentUser;

export const isAuthenticated = () => !!auth.currentUser;

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return fbOnAuthStateChanged(auth, callback);
};
