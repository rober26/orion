"use client";

import { Menu, Search, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import ProfileModal from "../../app/(dashboard)/social/perfil/ProfileModal";

const navigationTargets = [
  { label: "Resumen", href: "/" },
  { label: "Calendario", href: "/calendar" },
  { label: "Proyectos", href: "/projects" },
  { label: "Notas", href: "/notes" },
  { label: "Notebooks", href: "/notebooks" },
  { label: "Conexiones", href: "/social/connections" },
  { label: "IA Chat", href: "/ai/chat" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("Cargando...");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => {
        if (res.status === 401) {
          router.replace("/login");
          return Promise.reject(new Error("UNAUTHORIZED"));
        }

        return res.ok ? res.json() : Promise.reject(new Error("PROFILE_FETCH_ERROR"));
      })
      .then((data) => setUserName(data.username || "Usuario"))
      .catch(() => setUserName("Invitado"));
  }, [router]);

  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return [];
    }

    return navigationTargets
      .filter((item) => item.label.toLowerCase().includes(term) || item.href.toLowerCase().includes(term))
      .slice(0, 6);
  }, [query]);

  const handleNavigate = (href: string) => {
    router.push(href);
    setQuery("");
    setShowSuggestions(false);
    setIsMobileMenuOpen(false);
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
      <header className="surface-panel sticky top-0 z-40 w-full shrink-0 rounded-none border-x-0 border-t-0 bg-white/85 px-3 py-2 backdrop-blur-sm sm:px-4 lg:px-6 dark:bg-slate-900/85">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Image src="/orion_logo.svg" alt="Logo Orion" width={22} height={22} />
            <span className="text-lg font-black tracking-tight text-orion-primary">ORION</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navigationTargets.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                    isActive
                      ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="relative ml-auto hidden w-full max-w-xs lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
              placeholder="Buscar o ir a..."
              className="input-orion h-9 pl-9 text-sm"
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="surface-panel absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl p-1 shadow-2xl">
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

          <button
            onClick={() => setIsProfileOpen(true)}
            className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-blue-100 text-orion-primary transition-all hover:ring-4 hover:ring-blue-500/10 sm:flex dark:bg-blue-900/30"
            aria-label="Abrir perfil"
          >
            <User size={20} />
          </button>

          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="icon-btn ml-auto rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 lg:hidden dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            aria-label={isMobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-3 space-y-3 rounded-2xl border border-orion-border bg-white p-3 lg:hidden dark:border-orion-dark-border dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                placeholder="Buscar o ir a..."
                className="input-orion h-10 pl-9 text-sm"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="surface-panel absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl p-1 shadow-2xl">
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

            <nav className="grid grid-cols-2 gap-2">
              {navigationTargets.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`rounded-xl px-3 py-2 text-center text-xs font-bold uppercase tracking-wide transition-colors ${
                      isActive
                        ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button onClick={() => setIsProfileOpen(true)} className="btn-secondary w-full justify-center">
              <User size={16} /> Perfil ({userName})
            </button>
          </div>
        )}
      </header>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
