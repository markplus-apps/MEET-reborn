"use client";

import { Suspense } from "react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="hidden md:block">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto md:pb-0 safe-bottom">
          <div className="md:hidden">
            <Header />
          </div>
          {children}
          <div className="h-24 md:hidden" aria-hidden="true" />
        </main>
      </div>
      <Suspense>
        <BottomNav />
      </Suspense>
    </div>
  );
}
