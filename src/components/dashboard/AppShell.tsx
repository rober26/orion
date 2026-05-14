"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./Navbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-orion-bg dark:bg-slate-950">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Navbar />

        <main className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3 lg:p-4">
          <div className="page-container h-full min-h-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
