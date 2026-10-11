import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Siddheshwar Jewelers — Gold Mortgage Calculator",
  description: "Official Gold Mortgage Interest Calculator for Siddheshwar Jewelers",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SJ Mortgage",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#b48325",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#fbf9f5]">
      <body className="antialiased min-h-screen bg-[#fbf9f5] text-stone-900 selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
