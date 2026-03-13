"use client";
import { Search, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState("Cargando...");

  useEffect(() => {
    fetch("/api/users/me")
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUserName(data.username || "Usuario"))
      .catch(() => setUserName("Invitado"));
  }, []);

  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="h-16 w-full shrink-0 bg-white dark:bg-slate-900 border-b border-orion-border dark:border-orion-dark-border flex items-center justify-between px-8">
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        {/* Aplicamos la utilidad input-orion creada en globals.css */}
        <input type="text" placeholder="Buscar..." className="input-orion pl-10" />
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut size={20} />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-orion-border dark:border-orion-dark-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold dark:text-white">{userName}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Sesión Activa</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-orion-primary">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}