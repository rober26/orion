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

export default function ProjectSidebar() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const [projectDocs, setProjectDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      try {
        setLoading(true);
        // Filtramos documentos que pertenezcan a este proyecto
        const res = await fetch(`/api/notebooks/documents?projectId=${projectId}`);
        if (!res.ok) {
          throw new Error("No se pudieron cargar los documentos del proyecto");
        }
        const data = await res.json();
        setProjectDocs(Array.isArray(data) ? (data as ProjectDocument[]) : []);
      } catch (error) {
        console.error("Error al cargar sidebar del proyecto:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  // Función para determinar si un link está activo
  const isActive = (path: string) => pathname === path;

  return (
    <div className="w-72 border-r border-orion-border dark:border-orion-dark-border h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/10">
      
      {/* Header: Volver y Nombre del Proyecto */}
      <div className="p-4 border-b border-orion-border dark:border-orion-dark-border">
        <button 
          onClick={() => router.push('/projects')}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-orion-primary transition-colors mb-4 uppercase tracking-widest"
        >
          <ChevronLeft size={14} /> Volver a proyectos
        </button>
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-900 dark:text-white truncate">
            Espacio de Trabajo
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        
        {/* SECCIÓN: VISTAS PRINCIPALES */}
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
            label="Documentacion"
            active={isActive(`/projects/${projectId}/documentation`)}
          />
          <SidebarLink
            href={`/projects/${projectId}/members`}
            icon={<Users size={18} />}
            label="Miembros"
            active={isActive(`/projects/${projectId}/members`)}
          />
        </nav>

        {/* SECCIÓN: DOCUMENTACIÓN DEL PROYECTO */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documentos</p>
            <Search size={12} className="text-slate-400 cursor-pointer hover:text-slate-600" />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 italic">
              <Loader2 size={12} className="animate-spin" /> Cargando archivos...
            </div>
          ) : projectDocs.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-400 italic bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-orion-border dark:border-orion-dark-border text-center">
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

      {/* Footer: Configuración */}
      <div className="p-4 mt-auto border-t border-orion-border dark:border-orion-dark-border">
          <SidebarLink 
            href={`/projects/${projectId}/settings`} 
            icon={<Settings size={18} />} 
            label="Ajustes" 
          active={isActive(`/projects/${projectId}/settings`)} 
        />
      </div>
    </div>
  );
}

// Subcomponente de Link para el Sidebar
function SidebarLink({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link 
      href={href}
      className={`
        flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-all duration-200
        ${active 
          ? "bg-orion-surface dark:bg-slate-800 text-orion-primary shadow-sm border border-orion-border dark:border-orion-dark-border font-semibold" 
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
        }
      `}
    >
      <span className={active ? "text-orion-primary" : "text-slate-400"}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
