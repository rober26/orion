"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  FileText,
  ChevronLeft,
  LayoutDashboard,
  CheckSquare,
  Settings,
  Search,
  Users,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import DocumentEditorModal from "@/src/components/projects/DocumentEditorModal";
import { useParams, usePathname, useRouter } from "next/navigation";

interface ProjectDocument {
  id: string;
  title: string | null;
}

interface ProjectPermissions {
  canManage?: boolean;
  canEdit?: boolean;
}

interface ProjectSummaryResponse {
  name?: string;
  isArchived?: boolean;
  permissions?: ProjectPermissions;
}

export default function ProjectSidebar() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params.id as string;

  const [projectDocs, setProjectDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("Proyecto");
  const [isArchived, setIsArchived] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingDocumentTitle, setEditingDocumentTitle] = useState("");

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
        const projectPayload = (await projectRes.json()) as ProjectSummaryResponse;
        setProjectDocs(Array.isArray(data) ? (data as ProjectDocument[]) : []);
        setCanManage(Boolean(projectPayload.permissions?.canManage));
        setCanEdit(projectPayload.permissions?.canEdit !== false);
        setProjectName(projectPayload.name?.trim() || "Proyecto");
        setIsArchived(Boolean(projectPayload.isArchived));
      } catch (error) {
        console.error("Error al cargar sidebar del proyecto:", error);
        setCanManage(false);
        setCanEdit(true);
        setProjectName("Proyecto");
        setIsArchived(false);
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
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Proyecto</p>
          <h2 className="truncate text-base font-black text-slate-900 dark:text-white" title={projectName}>
            {projectName}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {isArchived && (
              <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                Archivado
              </span>
            )}
            {!canEdit && (
              <span className="inline-flex rounded-full bg-slate-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Solo lectura
              </span>
            )}
          </div>
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
            <div className="space-y-2 px-2 py-1">
              <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : projectDocs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-orion-border bg-slate-100/50 px-3 py-4 text-center text-xs italic text-slate-400 dark:border-orion-dark-border dark:bg-slate-800/30">
              No hay documentos aún.
            </div>
          ) : (
            projectDocs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  setEditingDocumentId(doc.id);
                  setEditingDocumentTitle(doc.title || "Sin título");
                }}
                className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <span className="text-slate-400">
                  <FileText size={18} />
                </span>
                <span className="truncate">{doc.title || "Sin título"}</span>
              </button>
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

      <DocumentEditorModal
        documentId={editingDocumentId}
        title={editingDocumentTitle}
        onClose={() => setEditingDocumentId(null)}
      />
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
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
      }`}
    >
      <span className={active ? "text-orion-primary" : "text-slate-400"}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
