import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-urbanist",
});

export const metadata: Metadata = {
  title: "WTVA Admin",
  description: "Where The Vibes At — operations admin portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${urbanist.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
