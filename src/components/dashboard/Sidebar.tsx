"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, FolderKanban, CheckSquare, 
  BookText, Users, Settings 
} from "lucide-react"; 

const menuItems = [
  { name: "Resumen", href: "/", icon: LayoutDashboard },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
  { name: "Tareas", href: "/tasks", icon: CheckSquare },
  { name: "Notebooks", href: "/notebooks", icon: BookText },
  { name: "Conexiones", href: "/social/connections", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-full shrink-0 bg-white dark:bg-slate-900 border-r border-orion-border dark:border-orion-dark-border flex flex-col">
      <div className="p-6">
        <span className="text-2xl font-bold text-orion-primary tracking-tighter">ORION</span>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-50 text-orion-primary dark:bg-blue-900/20" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-orion-border dark:border-orion-dark-border">
        <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
          <Settings size={20} />
          Configuración
        </Link>
      </div>
    </aside>
  );
}