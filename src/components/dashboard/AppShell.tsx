"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const SIDEBAR_STORAGE_KEY = "orion_sidebar_collapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const hasLoadedSidebarPreference = useRef(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = (await res.json()) as { authenticated?: boolean };

        if (!data.authenticated) {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    };

    void checkSession();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };

    const onWindowFocus = () => {
      void checkSession();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [router]);

  useEffect(() => {
    const storedValue = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const nextIsCollapsed = storedValue === null ? true : storedValue === "true";

    const frameId = window.requestAnimationFrame(() => {
      hasLoadedSidebarPreference.current = true;
      setIsCollapsed(nextIsCollapsed);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSidebarPreference.current) {
      return;
    }

    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-orion-bg dark:bg-slate-950">
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setIsMobileOpen(true)} />

        <main className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3 lg:p-3">
          <div className="page-container h-full min-h-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
