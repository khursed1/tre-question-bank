import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import SidebarLayout from "@/components/SidebarLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Question Bank",
  description: "A simple question bank management app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900`}>
        <SidebarLayout>
          {children}
        </SidebarLayout>
      </body>
    </html>
  );
}
