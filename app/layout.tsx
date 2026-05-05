import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Property Dashboard",
  description: "Real Estate Properties & Leads Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthGuard>
          <div className="flex h-dvh min-h-0 bg-gray-50">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
              {children}
            </main>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
