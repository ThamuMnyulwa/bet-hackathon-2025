"use client";

import { Suspense } from "react";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { QueryProvider } from "../providers/query-provider";
import { DotLoader } from "./ui/dot-loader";

export default function Providers({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center">
            <DotLoader
              frames={[
                [21, 22],
                [14, 21, 22, 29],
                [7, 14, 21, 22, 29, 36],
                [0, 7, 14, 21, 22, 29, 36, 43],
                [1, 8, 15, 22, 29, 36, 43],
                [2, 9, 16, 23, 30, 37, 44],
                [3, 10, 17, 24, 31, 38, 45],
                [4, 11, 18, 25, 32, 39, 46],
                [5, 12, 19, 26, 33, 40, 47],
                [6, 13, 20, 27, 34, 41, 48],
                [13, 20, 27, 34, 41, 48],
                [20, 27, 34, 41, 48],
                [27, 34, 41, 48],
                [34, 41],
                [41],
                [],
              ]}
              duration={120}
              dotClassName="bg-muted-foreground/30 [&.active]:bg-primary"
              className="gap-0.5"
            />
          </div>
        }>
          {children}
        </Suspense>
        <Toaster richColors />
      </ThemeProvider>
    </QueryProvider>
  );
}
