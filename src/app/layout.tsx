import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM Vendas WhatsApp",
  description: "Gerencie seus leads e conversas WhatsApp em um só lugar",
};

// FOUC prevention: reads localStorage and applies theme class to <html> before first paint.
// Mirrors the ThemeProvider config in providers.tsx (attribute="class", storageKey="theme",
// defaultTheme="system", enableSystem=true). Must be a Server Component <script> — do NOT
// move this into a "use client" file (React 19 won't execute inline scripts on the client).
const themeScript = `(function(){try{var t=localStorage.getItem("theme")||"system";if(t==="system")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.remove("light","dark");document.documentElement.classList.add(t)}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
