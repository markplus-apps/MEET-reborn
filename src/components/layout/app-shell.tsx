"use client";

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
        <main className="flex-1 overflow-y-auto pb-28 md:pb-0 safe-bottom">
          <div className="md:hidden">
            <Header />
          </div>
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
