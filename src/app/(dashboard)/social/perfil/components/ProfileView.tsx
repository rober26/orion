import { BookOpen, Globe, Lock, Mail, Pencil, User, FolderKanban } from "lucide-react";
import type { PublicNotebook, PublicProject, UserProfile } from "../types";

interface ProfileViewProps {
  profile: UserProfile;
  publicProjects: PublicProject[];
  publicNotebooks: PublicNotebook[];
  onEditClick: () => void;
}

export default function ProfileView({ profile, publicProjects, publicNotebooks, onEditClick }: ProfileViewProps) {
  const visibilityLabel = profile.profileVisibility === "PUBLIC" ? "Perfil publico" : "Perfil privado";

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-orion-border bg-blue-100 text-orion-primary dark:border-orion-dark-border dark:bg-blue-900/30">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User size={40} />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{profile.name}</h1>
                <button
                  type="button"
                  onClick={onEditClick}
                  className="icon-btn rounded-xl border border-orion-border bg-white text-slate-600 hover:text-orion-primary dark:border-orion-dark-border dark:bg-slate-900 dark:text-slate-300"
                  title="Editar perfil"
                >
                  <Pencil size={16} />
                </button>
              </div>
              <p className="text-sm font-semibold text-slate-500">
                @{profile.username}
                <span className="ml-1 text-slate-400">#{profile.tag}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                <Mail size={14} />
                {profile.email}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                {profile.profileVisibility === "PUBLIC" ? <Globe size={14} /> : <Lock size={14} />}
                {visibilityLabel}
              </span>
            </div>

            <p className="rounded-2xl border border-orion-border bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-orion-dark-border dark:bg-slate-900/50 dark:text-slate-300">
              {profile.bio || "Aun no agregaste una bio."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="surface-soft p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
            <FolderKanban size={16} />
            Proyectos publicos
          </h2>
          {publicProjects.length === 0 ? (
            <p className="text-sm text-slate-500">No hay proyectos publicos para mostrar.</p>
          ) : (
            <ul className="space-y-2">
              {publicProjects.map((project) => (
                <li key={project.id} className="rounded-xl border border-orion-border bg-white px-3 py-2 text-sm dark:border-orion-dark-border dark:bg-slate-900">
                  {project.name}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="surface-soft p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
            <BookOpen size={16} />
            Cuadernos publicos
          </h2>
          {publicNotebooks.length === 0 ? (
            <p className="text-sm text-slate-500">No hay cuadernos publicos para mostrar.</p>
          ) : (
            <ul className="space-y-2">
              {publicNotebooks.map((notebook) => (
                <li key={notebook.id} className="rounded-xl border border-orion-border bg-white px-3 py-2 text-sm dark:border-orion-dark-border dark:bg-slate-900">
                  {notebook.title}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
