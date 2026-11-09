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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b48325" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem("sj_theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="bg-[#fbf9f5] dark:bg-stone-950"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased min-h-screen bg-[#fbf9f5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 selection:bg-amber-100 dark:selection:bg-amber-900/60 selection:text-amber-900 dark:selection:text-amber-100 transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
