"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, FolderKanban, CheckSquare, 
  BookText, Users, Settings, ChevronLeft, ChevronRight 
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`h-full shrink-0 bg-white dark:bg-slate-900 border-r border-orion-border dark:border-orion-dark-border flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo y Botón de Control */}
      <div className={`p-4 mb-4 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <span className="text-2xl font-black text-orion-primary tracking-tighter ml-2 animate-in fade-in duration-500">
            ORION
          </span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-orion-primary hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all group relative"
        >
          <Image 
            src="/orion_logo.svg" 
            alt="Logo" 
            width={28} 
            height={28} 
            className={`transition-transform duration-500 ${isCollapsed ? "" : "rotate-[360deg]"}`}
          />
          {/* Tooltip pequeño para el logo cuando está colapsado */}
          {isCollapsed && (
            <span className="absolute left-14 scale-0 group-hover:scale-100 transition-all bg-slate-900 text-white text-xs p-2 rounded-md z-50 whitespace-nowrap">
              Expandir menú
            </span>
          )}
        </button>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 px-3 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                isActive 
                  ? "bg-blue-50 text-orion-primary dark:bg-blue-900/20 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <item.icon size={22} className={`shrink-0 ${isActive ? "text-orion-primary" : "group-hover:text-orion-primary"}`} />
              
              {!isCollapsed && (
                <span className="truncate animate-in slide-in-from-left-2 duration-300">
                  {item.name}
                </span>
              )}

              {/* Tooltip para modo colapsado */}
              {isCollapsed && (
                <span className="absolute left-14 scale-0 group-hover:scale-100 transition-all bg-orion-primary text-white text-xs px-3 py-2 rounded-lg z-50 whitespace-nowrap shadow-xl">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sección Inferior (Configuración) */}
      <div className="p-3 border-t border-orion-border dark:border-orion-dark-border">
        <Link 
          href="/settings" 
          className={`flex items-center gap-4 px-3 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group relative ${
            pathname === "/settings" ? "bg-slate-100 dark:bg-slate-800 text-orion-primary" : ""
          }`}
        >
          <Settings size={22} className="shrink-0 group-hover:rotate-45 transition-transform duration-500" />
          {!isCollapsed && <span>Configuración</span>}
          
          {isCollapsed && (
            <span className="absolute left-14 scale-0 group-hover:scale-100 transition-all bg-slate-900 text-white text-xs px-3 py-2 rounded-lg z-50 whitespace-nowrap">
              Configuración
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}