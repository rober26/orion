"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { CalendarDays, FolderKanban, Loader2, Lock, User } from "lucide-react";
import PublicContentExplorer from "../components/PublicContentExplorer";

type PublicProject = {
  id: string;
  name: string;
};

type PublicNotebook = {
  id: string;
  title: string;
  folderId: string | null;
};

type PublicFolder = {
  id: string;
  name: string;
};

type PublicDocument = {
  id: string;
  title: string;
  notebookId: string | null;
  updatedAt: string;
};

type PublicCalendar = {
  id: string;
  name: string;
  color: string | null;
};

type ProfilePayload = {
  profile: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    name: string;
    tag: string;
  };
  projects: PublicProject[];
  notebooks: PublicNotebook[];
  folders: PublicFolder[];
  documents: PublicDocument[];
  calendars: PublicCalendar[];
};

type ApiError = { error?: string };

export default function ConnectionProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfilePayload | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/social/users/${userId}/profile`, { cache: "no-store" });
      const payload = (await response.json()) as ProfilePayload | ApiError;

      if (!response.ok) {
        throw new Error((payload as ApiError).error || "No se pudo cargar el perfil");
      }

      setData(payload as ProfilePayload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Perfil de conexion</h1>
          <Link
            href="/social/connections"
            className="rounded-xl border border-orion-border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-orion-dark-border dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Volver
          </Link>
        </div>

        {loading ? (
          <div className="surface-panel min-h-[320px] flex items-center justify-center gap-2 text-slate-500">
            <Loader2 size={18} className="animate-spin" /> Cargando perfil...
          </div>
        ) : error || !data ? (
          <div className="surface-panel min-h-[320px] flex flex-col items-center justify-center gap-3 text-center">
            <Lock size={20} className="text-slate-400" />
            <p className="text-sm text-slate-500">{error || "No se pudo cargar el perfil"}</p>
            <button
              type="button"
              onClick={() => void loadProfile()}
              className="btn-primary rounded-xl px-3 py-2 text-sm"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <section className="surface-panel p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-orion-border bg-blue-100 text-orion-primary dark:border-orion-dark-border dark:bg-blue-900/30">
                  {data.profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User size={40} />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{data.profile.name}</h2>
                    <p className="text-sm font-semibold text-slate-500">
                      @{data.profile.username}
                      <span className="ml-1 text-slate-400">#{data.profile.tag}</span>
                    </p>
                  </div>

                  <p className="rounded-2xl border border-orion-border bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-orion-dark-border dark:bg-slate-900/50 dark:text-slate-300">
                    {data.profile.bio || "Este usuario aun no agrego una bio publica."}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <article className="surface-soft p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                  <FolderKanban size={16} /> Proyectos publicos
                </h3>
                {data.projects.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay proyectos publicos para mostrar.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.projects.map((project) => (
                      <li key={project.id}>
                        <Link
                          href={`/projects/${project.id}`}
                          className="block rounded-xl border border-orion-border bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-orion-dark-border dark:bg-slate-900 dark:hover:bg-slate-800"
                        >
                          {project.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="surface-soft p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                  <CalendarDays size={16} /> Calendarios publicos
                </h3>
                {data.calendars.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay calendarios publicos para mostrar.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.calendars.map((calendar) => (
                      <li key={calendar.id}>
                        <div className="block rounded-xl border border-orion-border bg-white px-3 py-2 text-sm font-semibold dark:border-orion-dark-border dark:bg-slate-900">
                          <span className="inline-block h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: calendar.color || "#2563eb" }} />
                          {calendar.name}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>

            <PublicContentExplorer
              title="Documentacion publica"
              folders={data.folders}
              notebooks={data.notebooks}
              documents={data.documents}
            />
          </>
        )}
      </div>
    </div>
  );
}
