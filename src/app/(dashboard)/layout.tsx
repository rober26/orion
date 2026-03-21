import Sidebar from "@/src/components/dashboard/Sidebar";
import Navbar from "@/src/components/dashboard/Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-orion-bg dark:bg-slate-950">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 h-full">
        <Navbar />

        <main className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3 lg:p-3">
          <div className="page-container h-full min-h-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
