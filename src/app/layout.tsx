import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { GlobalErrorTrap } from "@/components/GlobalErrorTrap";

export const metadata: Metadata = {
  title: "CoreVita",
  description: "CoreVita Radiology Platform"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
        <GlobalErrorTrap />
        <Toaster />
      </body>
    </html>
  );
}
