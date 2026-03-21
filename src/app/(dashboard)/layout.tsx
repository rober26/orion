import Sidebar from "@/src/components/dashboard/Sidebar";
import Navbar from "@/src/components/dashboard/Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-orion-bg dark:bg-slate-950">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 h-full">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="page-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
