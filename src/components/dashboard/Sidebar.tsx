"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, FolderKanban, 
  BookText, Users, Settings, ChevronLeft, ChevronRight, 
  Calendar
} from "lucide-react"; 

const menuItems = [
  { name: "Resumen", href: "/", icon: LayoutDashboard },
  { name: "Calendario", href: "/calendar", icon: Calendar },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
  { name: "Notebooks", href: "/notebooks", icon: BookText },
  { name: "Conexiones", href: "/social/connections", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  // CAMBIO: Inicializamos en true para que nazca colapsado
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <aside 
      className={`h-full shrink-0 bg-orion-surface dark:bg-slate-900 border-r border-orion-border dark:border-orion-dark-border flex flex-col transition-all duration-500 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo y Botón de Control */}
      <div className={`p-4 mb-4 flex items-center h-20 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <span className="text-2xl font-black text-orion-primary tracking-tighter ml-2 animate-in fade-in slide-in-from-left-4 duration-500">
            ORION
          </span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="icon-btn rounded-xl bg-slate-50 dark:bg-slate-800/50 text-orion-primary hover:bg-blue-100 dark:hover:bg-blue-900/30 group relative active:scale-90"
        >
          <Image 
            src="/orion_logo.svg" 
            alt="Logo" 
            width={28} 
            height={28} 
            className={`transition-transform duration-700 ${isCollapsed ? "" : "rotate-[360deg]"}`}
          />
          
          {/* Tooltip solo cuando está colapsado */}
          {isCollapsed && (
            <span className="absolute left-16 scale-0 group-hover:scale-100 transition-all bg-slate-900 text-white text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-lg z-50 whitespace-nowrap pointer-events-none">
              Expandir menú
            </span>
          )}
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-2">
        {menuItems.map((item) => {
          // Lógica para detectar si el path actual empieza con el href (ej: /projects/[id])
          const isActive = item.href === "/" 
            ? pathname === "/" 
            : pathname.startsWith(item.href);

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
              <item.icon 
                size={22} 
                className={`shrink-0 transition-colors ${isActive ? "text-orion-primary" : "group-hover:text-orion-primary"}`} 
              />
              
              {!isCollapsed && (
                <span className="truncate animate-in fade-in slide-in-from-left-4 duration-500">
                  {item.name}
                </span>
              )}

              {/* Tooltip flotante al estar colapsado */}
              {isCollapsed && (
                <span className="absolute left-16 scale-0 group-hover:scale-100 transition-all bg-orion-primary text-white text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-lg z-50 whitespace-nowrap shadow-xl pointer-events-none">
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
          <Settings size={22} className="shrink-0 group-hover:rotate-90 transition-transform duration-700" />
          {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500">Configuración</span>}
          
          {isCollapsed && (
            <span className="absolute left-16 scale-0 group-hover:scale-100 transition-all bg-slate-900 text-white text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-lg z-50 whitespace-nowrap pointer-events-none">
              Configuración
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}
