"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  FileText,
  ChevronLeft,
  LayoutDashboard,
  CheckSquare,
  Settings,
  Loader2,
  Search,
  Users,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

interface ProjectDocument {
  id: string;
  title: string | null;
}

interface ProjectPermissions {
  canManage?: boolean;
}

export default function ProjectSidebar() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const [projectDocs, setProjectDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      try {
        setLoading(true);
        const [res, projectRes] = await Promise.all([
          fetch(`/api/notebooks/documents?projectId=${projectId}`),
          fetch(`/api/projects/${projectId}`, { cache: "no-store" }),
        ]);
        if (!res.ok) {
          throw new Error("No se pudieron cargar los documentos del proyecto");
        }
        const data = await res.json();
        const projectPayload = (await projectRes.json()) as { permissions?: ProjectPermissions };
        setProjectDocs(Array.isArray(data) ? (data as ProjectDocument[]) : []);
        setCanManage(Boolean(projectPayload.permissions?.canManage));
      } catch (error) {
        console.error("Error al cargar sidebar del proyecto:", error);
        setCanManage(false);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="h-full w-72 border-r border-orion-border bg-slate-50/60 dark:border-orion-dark-border dark:bg-slate-900/20">
      <div className="flex h-full flex-col">
      <div className="border-b border-orion-border p-4 dark:border-orion-dark-border">
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100 hover:text-orion-primary dark:text-slate-300 dark:hover:bg-slate-800/60"
        >
          <ChevronLeft size={14} /> Volver a proyectos
        </button>
        <div className="flex items-center justify-between">
          <h2 className="truncate font-black text-slate-900 dark:text-white">
            Espacio de Trabajo
          </h2>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-3">
        <nav className="space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">General</p>
          <SidebarLink
            href={`/projects/${projectId}`}
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={isActive(`/projects/${projectId}`)}
          />
          <SidebarLink
            href={`/projects/${projectId}/tasks`}
            icon={<CheckSquare size={18} />}
            label="Tareas"
            active={isActive(`/projects/${projectId}/tasks`)}
          />
          <SidebarLink
            href={`/projects/${projectId}/documentation`}
            icon={<BookOpen size={18} />}
            label="Documentación"
            active={isActive(`/projects/${projectId}/documentation`)}
          />
          <SidebarLink
            href={`/projects/${projectId}/members`}
            icon={<Users size={18} />}
            label="Miembros"
            active={isActive(`/projects/${projectId}/members`)}
          />
        </nav>

        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documentos</p>
            <Search size={12} className="cursor-pointer text-slate-400 hover:text-slate-600" aria-hidden="true" />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs italic text-slate-400">
              <Loader2 size={12} className="animate-spin" /> Cargando archivos...
            </div>
          ) : projectDocs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-orion-border bg-slate-100/50 px-3 py-4 text-center text-xs italic text-slate-400 dark:border-orion-dark-border dark:bg-slate-800/30">
              No hay documentos aún.
            </div>
          ) : (
            projectDocs.map((doc) => (
              <SidebarLink
                key={doc.id}
                href={`/notebooks?doc=${doc.id}`}
                icon={<FileText size={18} />}
                label={doc.title || "Sin título"}
                active={pathname === "/notebooks" && searchParams.get("doc") === doc.id}
              />
            ))
          )}
        </div>
      </div>

      {canManage && (
        <div className="mt-auto border-t border-orion-border p-4 dark:border-orion-dark-border">
          <SidebarLink
            href={`/projects/${projectId}/settings`}
            icon={<Settings size={18} />}
            label="Ajustes"
            active={isActive(`/projects/${projectId}/settings`)}
          />
        </div>
      )}
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/40 ${
        active
          ? "border border-orion-border bg-orion-surface font-semibold text-orion-primary shadow-sm dark:border-orion-dark-border dark:bg-slate-800"
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
      }`}
    >
      <span className={active ? "text-orion-primary" : "text-slate-400"}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
