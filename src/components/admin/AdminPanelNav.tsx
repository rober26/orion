"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin-panel/users", label: "Usuarios" },
  { href: "/admin-panel/access-requests", label: "Solicitudes" },
  { href: "/admin-panel/settings", label: "Configuración" },
];

export default function AdminPanelNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              isActive
                ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
