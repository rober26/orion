"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProjectSidebar from "@/src/components/projects/ProjectSidebar";
import { Loader2, Lock, Unlock } from "lucide-react";

interface ApiError {
  error?: string;
}

interface ProjectSettingsData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isPublic: boolean;
  isArchived: boolean;
}

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectSettingsData | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/projects/${id}`);
        const payload = (await res.json()) as ProjectSettingsData & ApiError;

        if (!res.ok) {
          throw new Error(payload.error || "No se pudo cargar el proyecto");
        }

        setForm(payload);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "No se pudo cargar la configuracion";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadProject();
  }, [id]);

  const saveProject = async () => {
    if (!form || saving) {
      return;
    }

    const normalizedName = form.name.trim();
    if (!normalizedName) {
      setError("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          description: (form.description || "").trim(),
          color: form.color || "#3b82f6",
          isPublic: form.isPublic,
          isArchived: form.isArchived,
        }),
      });

      const payload = (await res.json()) as ProjectSettingsData & ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo guardar el proyecto");
      }

      setForm((prev) => (prev ? { ...prev, ...payload } : prev));
      setSuccess("Configuracion guardada correctamente");
      router.refresh();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "No se pudo guardar la configuracion";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const archiveProject = async (archive: boolean) => {
    if (!form || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: archive }),
      });

      const payload = (await res.json()) as ProjectSettingsData & ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo actualizar el estado");
      }

      setForm((prev) => (prev ? { ...prev, isArchived: payload.isArchived } : prev));
      setSuccess(archive ? "Proyecto archivado" : "Proyecto restaurado");
      router.refresh();
    } catch (archiveError) {
      const message = archiveError instanceof Error ? archiveError.message : "No se pudo actualizar el estado";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full bg-orion-surface dark:bg-slate-950 overflow-hidden">
      <ProjectSidebar />

      <main className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
            <Loader2 className="animate-spin" size={20} />
            <span className="ml-2">Cargando ajustes del proyecto...</span>
          </div>
        ) : error && !form ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-red-600 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        ) : form ? (
          <section className="mx-auto w-full max-w-3xl space-y-6">
            <header>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Ajustes del proyecto</h1>
              <p className="mt-2 text-slate-500">Actualiza los datos generales y el estado del proyecto.</p>
            </header>

            <div className="surface-panel rounded-[2rem] p-6 space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Nombre</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="input-orion"
                  maxLength={100}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Descripcion</span>
                <textarea
                  value={form.description || ""}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="input-orion min-h-28 resize-none"
                  maxLength={300}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Color</span>
                <input
                  type="text"
                  value={form.color || "#3b82f6"}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                  className="input-orion"
                  placeholder="#3b82f6"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-orion-border px-4 py-3 dark:border-orion-dark-border">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Visibilidad publica</p>
                  <p className="text-sm text-slate-500">Permite mostrar el proyecto en tu perfil social.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                    form.isPublic
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {form.isPublic ? <Unlock size={12} /> : <Lock size={12} />}
                  {form.isPublic ? "Publico" : "Privado"}
                </button>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-orion-border pt-4 dark:border-orion-dark-border">
                <button
                  type="button"
                  onClick={() => void archiveProject(!form.isArchived)}
                  disabled={saving}
                  className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-70 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20"
                >
                  {form.isArchived ? "Restaurar proyecto" : "Archivar proyecto"}
                </button>

                <button
                  type="button"
                  onClick={() => void saveProject()}
                  disabled={saving}
                  className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    "Guardar cambios"
                  )}
                </button>
              </div>

              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
              {success && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{success}</p>}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
