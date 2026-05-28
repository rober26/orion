"use client";

import { Menu, Search, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

const navigationTargets = [
  { label: "Resumen", href: "/" },
  { label: "Calendario", href: "/calendar" },
  { label: "Proyectos", href: "/projects" },
  { label: "Notebooks", href: "/notebooks" },
  { label: "IA Chat", href: "/ai/chat" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("Cargando...");
  const [userRole, setUserRole] = useState<string>("USER");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => {
        if (res.status === 401) {
          router.replace("/login");
          return Promise.reject(new Error("UNAUTHORIZED"));
        }

        return res.ok ? res.json() : Promise.reject(new Error("PROFILE_FETCH_ERROR"));
      })
      .then((data) => {
        setUserName(data.username || "Usuario");
        setUserRole(typeof data.role === "string" ? data.role : "USER");
      })
      .catch(() => {
        setUserName("Invitado");
        setUserRole("USER");
      });
  }, [router]);

  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    if (!isMobileSearchOpen && !isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const onWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsMobileSearchOpen(false);
        setShowSuggestions(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onWindowKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [isMobileMenuOpen, isMobileSearchOpen]);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const onWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      if (target.closest("[data-account-menu='true']")) {
        return;
      }

      setIsAccountMenuOpen(false);
    };

    window.addEventListener("keydown", onWindowKeyDown);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (isMobileSearchOpen) {
      requestAnimationFrame(() => {
        mobileSearchInputRef.current?.focus();
      });
    }
  }, [isMobileSearchOpen]);

  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return [];
    }

    return navigationTargets
      .filter((item) => item.label.toLowerCase().includes(term) || item.href.toLowerCase().includes(term))
      .slice(0, 6);
  }, [query]);

  const mobileNavigationTargets = useMemo(
    () => navigationTargets.filter((item) => item.href !== "/"),
    [],
  );

  const handleNavigate = (href: string) => {
    router.push(href);
    setQuery("");
    setShowSuggestions(false);
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
    setIsAccountMenuOpen(false);
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
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

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        return;
      }

      setIsAccountMenuOpen(false);
      setIsMobileMenuOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      // no-op
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar menu"
        onClick={() => {
          setIsMobileMenuOpen(false);
          setShowSuggestions(false);
        }}
        className={`fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden ${
          isMobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <button
        type="button"
        aria-label="Cerrar buscador"
        onClick={() => {
          setIsMobileSearchOpen(false);
          setShowSuggestions(false);
        }}
        className={`fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          isMobileSearchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <header className="surface-panel sticky top-0 z-40 w-full shrink-0 rounded-none border-x-0 border-t-0 bg-white/85 px-3 py-2 backdrop-blur-sm sm:px-4 lg:px-6 dark:bg-slate-900/85">
        <div className="relative flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Image src="/svg/2.svg" alt="Logo Orion" width={32} height={32} className="h-7 w-7 sm:h-8 sm:w-8" />
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
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
            className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-blue-100 text-orion-primary transition-all hover:ring-4 hover:ring-blue-500/10 lg:flex dark:bg-blue-900/30"
            aria-label="Abrir menu de cuenta"
            aria-expanded={isAccountMenuOpen}
            aria-controls="orion-account-menu"
            data-account-menu="true"
          >
            <User size={20} />
          </button>

          <div
            ref={accountMenuRef}
            id="orion-account-menu"
            data-account-menu="true"
            className={`absolute right-0 top-12 z-50 hidden w-64 overflow-hidden rounded-2xl border border-orion-border bg-white p-2 shadow-2xl transition-all duration-200 sm:block dark:border-orion-dark-border dark:bg-slate-900 ${
              isAccountMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
            }`}
            role="menu"
            aria-label="Menu de cuenta"
          >
            <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cuenta</p>
              <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{userName}</p>
            </div>

            <Link
              href="/social/perfil"
              onClick={() => setIsAccountMenuOpen(false)}
              className={`block rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                pathname.startsWith("/social/perfil")
                  ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
              role="menuitem"
            >
              Mi perfil
            </Link>
            <Link
              href="/social/perfil?tab=security"
              onClick={() => setIsAccountMenuOpen(false)}
              className={`mt-1 block rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                pathname.startsWith("/social/perfil")
                  ? "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
              role="menuitem"
            >
              Seguridad
            </Link>
            <Link
              href="/social/connections"
              onClick={() => setIsAccountMenuOpen(false)}
              className={`mt-1 block rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                pathname.startsWith("/social/connections")
                  ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
              role="menuitem"
            >
              Conexiones
            </Link>

            {isAdmin ? (
              <div className="mt-2 border-t border-orion-border pt-2 dark:border-orion-dark-border">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Administracion</p>
                <Link
                  href="/social/perfil?tab=admin"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className={`block rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    pathname.startsWith("/social/perfil") ? "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                  role="menuitem"
                >
                  Administracion
                </Link>
                <Link
                  href="/admin-panel/access-requests"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="mt-1 block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  role="menuitem"
                >
                  Solicitudes acceso
                </Link>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-2 block w-full rounded-xl border border-red-300 px-3 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
              role="menuitem"
            >
              Cerrar sesion
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <button
              onClick={() => {
                setIsMobileSearchOpen(true);
                setIsMobileMenuOpen(false);
                setIsAccountMenuOpen(false);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-all hover:ring-4 hover:ring-slate-300/50 dark:bg-slate-800 dark:text-slate-100"
              aria-label="Abrir buscador"
              aria-expanded={isMobileSearchOpen}
              aria-controls="orion-mobile-search"
            >
              <Search size={18} />
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen((prev) => !prev);
                setIsAccountMenuOpen(false);
                setIsMobileSearchOpen(false);
                setShowSuggestions(false);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-orion-primary transition-all hover:ring-4 hover:ring-blue-500/10 dark:bg-blue-900/30"
              aria-label={isMobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="orion-mobile-menu"
            >
              <span className={`transition-transform duration-300 ${isMobileMenuOpen ? "rotate-90" : "rotate-0"}`}>
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </span>
            </button>
          </div>

          <div
            id="orion-mobile-menu"
            className={`absolute right-0 top-12 z-50 w-[min(92vw,22rem)] lg:hidden ${
              isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
            }`}
            role="dialog"
            aria-label="Menu movil"
          >
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isMobileMenuOpen ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div
                className={`space-y-3 rounded-2xl border border-orion-border bg-white p-3 shadow-2xl transition-all duration-300 dark:border-orion-dark-border dark:bg-slate-900 ${
                  isMobileMenuOpen ? "translate-y-0 scale-100" : "-translate-y-2 scale-[0.98]"
                }`}
                style={{ transformOrigin: "top right" }}
              >
                <nav className="grid grid-cols-2 gap-2">
                  {mobileNavigationTargets.map((item, index) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`rounded-xl px-3 py-2 text-center text-xs font-bold uppercase tracking-wide transition-all duration-300 ${
                          isActive
                            ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                        style={{ transitionDelay: `${index * 18}ms` }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="rounded-2xl border border-orion-border bg-slate-50 p-2 dark:border-orion-dark-border dark:bg-slate-800">
                  <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cuenta</p>
                  <p className="mb-2 px-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{userName}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/social/perfil"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`rounded-xl px-3 py-2 text-center text-xs font-bold uppercase tracking-wide transition-colors ${
                        pathname.startsWith("/social/perfil")
                          ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                          : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      Perfil
                    </Link>
                    <Link
                      href="/social/perfil?tab=security"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="rounded-xl px-3 py-2 text-center text-xs font-bold uppercase tracking-wide bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Seguridad
                    </Link>
                    <Link
                      href="/social/connections"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`rounded-xl px-3 py-2 text-center text-xs font-bold uppercase tracking-wide transition-colors ${
                        pathname.startsWith("/social/connections")
                          ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                          : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      Conexiones
                    </Link>
                  </div>

                  {isAdmin ? (
                    <div className="mt-2 rounded-xl border border-orion-border bg-white p-2 dark:border-orion-dark-border dark:bg-slate-900">
                      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Administracion</p>
                      <div className="grid grid-cols-1 gap-2">
                        <Link
                          href="/social/perfil?tab=admin"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                        >
                          Administracion
                        </Link>
                        <Link
                          href="/admin-panel/access-requests"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                        >
                          Solicitudes
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="mt-2 w-full rounded-xl border border-red-300 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    Cerrar sesion
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div
        id="orion-mobile-search"
        className={`fixed inset-0 z-[60] flex items-start justify-center px-3 pt-20 transition-opacity duration-200 lg:hidden ${
          isMobileSearchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-label="Buscador movil"
      >
        <div
          className={`surface-panel w-full max-w-md rounded-2xl border border-orion-border p-3 shadow-2xl transition-all duration-300 dark:border-orion-dark-border ${
            isMobileSearchOpen ? "translate-y-0 scale-100" : "-translate-y-3 scale-[0.97]"
          }`}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              ref={mobileSearchInputRef}
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
              className="input-orion h-11 pl-9 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen(false);
                setShowSuggestions(false);
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Cerrar buscador"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-2">
            {showSuggestions && suggestions.length > 0 ? (
              <div className="space-y-1">
                {suggestions.map((item) => (
                  <button
                    key={item.href}
                    onMouseDown={() => handleNavigate(item.href)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-slate-400">{item.href}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-2 py-3 text-xs text-slate-500 dark:text-slate-400">Escribe para encontrar paginas rapido.</p>
            )}
          </div>
        </div>
      </div>

    </>
  );
}
