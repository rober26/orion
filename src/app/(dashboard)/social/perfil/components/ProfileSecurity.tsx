"use client";

import { KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeMyPassword } from "../services/profileService";

export default function ProfileSecurity() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const result = await changeMyPassword({ currentPassword, newPassword });
      setMessage(result.message);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <section className="surface-panel space-y-6 p-6 sm:p-8">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Seguridad</h2>
        <p className="text-sm text-slate-500">Gestiona tu contraseña y tu sesión activa.</p>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <label className="space-y-2 block">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Contraseña actual</span>
          <input
            type="password"
            className="input-orion"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>

        <label className="space-y-2 block">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nueva contraseña</span>
          <input
            type="password"
            className="input-orion"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </label>

        {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          <KeyRound size={16} />
          {saving ? "Actualizando..." : "Cambiar contraseña"}
        </button>
      </form>

      <div className="border-t border-orion-border pt-5 dark:border-orion-dark-border">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </section>
  );
}
