"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  BookText,
  Calendar,
  FolderKanban,
  LayoutDashboard,
  StickyNote,
  Users,
} from "lucide-react";
import { type ComponentType } from "react";

type SidebarProps = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
};

type MenuItem = {
  name: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const mainMenuItems: MenuItem[] = [
  { name: "Resumen", href: "/", icon: LayoutDashboard },
  { name: "IA Chat", href: "/ai/chat", icon: Bot },
  { name: "Calendario", href: "/calendar", icon: Calendar },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
  { name: "Notas", href: "/notes", icon: StickyNote },
  { name: "Notebooks", href: "/notebooks", icon: BookText },
  { name: "Conexiones", href: "/social/connections", icon: Users },
];

function MenuLink({
  item,
  isCollapsed,
  pathname,
  onNavigate,
}: {
  item: MenuItem;
  isCollapsed: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  return (
    <Link
      key={item.href}
      href={item.href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-4 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
        isActive
          ? "bg-blue-50 text-orion-primary shadow-sm dark:bg-blue-900/20"
          : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
      }`}
    >
      <item.icon
        size={22}
        className={`shrink-0 transition-colors ${isActive ? "text-orion-primary" : "group-hover:text-orion-primary"}`}
      />

      {!isCollapsed && <span className="truncate">{item.name}</span>}

      {isCollapsed && (
        <span className="pointer-events-none absolute left-16 scale-0 whitespace-nowrap rounded-lg bg-orion-primary px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-xl transition-all group-hover:scale-100">
          {item.name}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar({
  isCollapsed,
  isMobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const asideClasses = `h-full shrink-0 border-r border-orion-border bg-orion-surface dark:border-orion-dark-border dark:bg-slate-900 flex flex-col transition-all duration-300 ease-in-out ${
    isCollapsed ? "w-20" : "w-64"
  }`;

  return (
    <>
      <div
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 ${asideClasses} -translate-x-full lg:translate-x-0 lg:static ${
          isMobileOpen ? "translate-x-0" : ""
        }`}
      >
        <div className={`mb-2 flex h-20 items-center p-4 ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {!isCollapsed && <span className="ml-2 text-2xl font-black tracking-tighter text-orion-primary">ORION</span>}

          <div className="flex items-center gap-2">
            <button
              onClick={isMobileOpen ? onCloseMobile : onToggleCollapse}
              className="icon-btn group relative rounded-xl bg-slate-50 text-orion-primary hover:bg-blue-100 active:scale-90 dark:bg-slate-800/50 dark:hover:bg-blue-900/30"
            >
              <Image
                src="/orion_logo.svg"
                alt="Logo Orion"
                width={28}
                height={28}
                className={`transition-transform duration-700 ${isCollapsed ? "" : "rotate-[360deg]"}`}
              />

              {isCollapsed && (
                <span className="pointer-events-none absolute left-16 scale-0 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all group-hover:scale-100">
                  Expandir menu
                </span>
              )}
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-3">
          {mainMenuItems.map((item) => (
            <MenuLink
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
              pathname={pathname}
              onNavigate={onCloseMobile}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
