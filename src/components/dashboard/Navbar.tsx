"use client";
import { ChevronRight, Search, User } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import ProfileModal from "../../app/(dashboard)/social/perfil/ProfileModal";

const navigationTargets = [
  { label: "Resumen", href: "/" },
  { label: "Calendario", href: "/calendar" },
  { label: "Proyectos", href: "/projects" },
  { label: "Notebooks", href: "/notebooks" },
  { label: "Conexiones", href: "/social/connections" },
];

function prettifySegment(segment: string) {
  if (!segment) {
    return "Resumen";
  }

  return decodeURIComponent(segment)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("Cargando...");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUserName(data.username || "Usuario"))
      .catch(() => setUserName("Invitado"));
  }, []);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const links = segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      return { label: prettifySegment(segment), href };
    });

    return [{ label: "Resumen", href: "/" }, ...links];
  }, [pathname]);

  const pageTitle = useMemo(() => {
    const match = navigationTargets.find((target) =>
      target.href === "/" ? pathname === "/" : pathname.startsWith(target.href),
    );

    if (match) {
      return match.label;
    }

    return breadcrumbs[breadcrumbs.length - 1]?.label ?? "Orion";
  }, [breadcrumbs, pathname]);

  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return [];
    }

    return navigationTargets
      .filter((item) => item.label.toLowerCase().includes(term) || item.href.toLowerCase().includes(term))
      .slice(0, 5);
  }, [query]);

  const handleNavigate = (href: string) => {
    router.push(href);
    setQuery("");
    setShowSuggestions(false);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setShowSuggestions(false);
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (suggestions.length > 0) {
      handleNavigate(suggestions[0].href);
    }
  };

  return (
    <>
      <header className="surface-panel z-30 flex w-full shrink-0 items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-6 lg:h-16 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
          <button
            onClick={onMenuClick}
            className="icon-btn rounded-xl bg-slate-50 text-orion-primary hover:bg-blue-100 active:scale-95 lg:hidden dark:bg-slate-800/50 dark:hover:bg-blue-900/30"
            aria-label="Abrir menu"
          >
            <Image src="/orion_logo.svg" alt="Logo Orion" width={20} height={20} />
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{pageTitle}</p>
            <div className="hidden items-center text-xs text-slate-500 sm:flex">
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.href} className="inline-flex items-center">
                  {index > 0 && <ChevronRight size={12} className="mx-1" />}
                  {crumb.label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative ml-auto w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 120);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="Ir a..."
              className="input-orion h-10 pl-10"
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="surface-panel absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-xl p-1 shadow-2xl">
                {suggestions.map((item) => (
                  <button
                    key={item.href}
                    onMouseDown={() => handleNavigate(item.href)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-slate-400">{item.href}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ml-4 flex items-center gap-4">
          <div className="flex items-center gap-3 border-l border-orion-border pl-4 dark:border-orion-dark-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold dark:text-white leading-tight">{userName}</p>
            </div>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-orion-primary hover:ring-4 hover:ring-blue-500/10 transition-all cursor-pointer"
            >
              <User size={20} />
            </button>
          </div>
        </div>
      </header>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
