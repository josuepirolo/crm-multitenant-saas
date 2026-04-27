"use client";

import { Suspense } from "react";
import { ThemeProvider } from "next-themes";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <ThemeProvider attribute="class" forcedTheme="light" enableColorScheme={false}>
        {children}
      </ThemeProvider>
    </Suspense>
  );
}
