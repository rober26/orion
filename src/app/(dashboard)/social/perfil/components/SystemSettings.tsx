"use client";

import { LoaderCircle, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminSettings, updateAdminSettings } from "../services/profileService";

export default function SystemSettings() {
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const settings = await getAdminSettings();
        setAllowRegistration(settings.allowRegistration);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar la configuración del sistema");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await updateAdminSettings({ allowRegistration });
      setAllowRegistration(updated.allowRegistration);
      setMessage("Configuración del sistema actualizada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <article className="surface-panel p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Settings size={18} />
          Config. sistema
        </h2>
        <p className="mt-1 text-sm text-slate-500">Controla opciones globales del sistema Orion.</p>

        {loading ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle size={14} className="animate-spin" />
            Cargando configuración...
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="flex items-center justify-between rounded-2xl border border-orion-border bg-slate-50 px-4 py-3 dark:border-orion-dark-border dark:bg-slate-900">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">Registro global</p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Habilita o bloquea el registro público de nuevos usuarios.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllowRegistration((prev) => !prev)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
                  allowRegistration ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
                aria-pressed={allowRegistration}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    allowRegistration ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex justify-end">
              <button className="btn-primary" onClick={onSave} disabled={saving}>
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
