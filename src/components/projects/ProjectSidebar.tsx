"use client";
import { useState, useEffect } from "react";
import { 
  FileText, 
  ChevronLeft, 
  Plus, 
  LayoutDashboard, 
  CheckSquare, 
  Settings,
  Loader2,
  Search
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";

export default function ProjectSidebar() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params.id as string;

  const [projectDocs, setProjectDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      try {
        setLoading(true);
        // Filtramos documentos que pertenezcan a este proyecto
        const res = await fetch(`/api/notebooks/documents?projectId=${projectId}`);
        const data = await res.json();
        setProjectDocs(data);
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
    <div className="w-72 border-r border-orion-border dark:border-slate-800 h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/10">
      
      {/* Header: Volver y Nombre del Proyecto */}
      <div className="p-4 border-b border-orion-border dark:border-slate-800">
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
          <button className="p-1.5 bg-orion-primary/10 text-orion-primary rounded-lg hover:bg-orion-primary hover:text-white transition-all">
            <Plus size={16} />
          </button>
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
            <div className="px-3 py-4 text-xs text-slate-400 italic bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
              No hay documentos aún.
            </div>
          ) : (
            projectDocs.map((doc: any) => (
              <SidebarLink 
                key={doc.id}
                href={`/notebooks/editor/${doc.id}?fromProject=${projectId}`} 
                icon={<FileText size={18} />} 
                label={doc.title || "Sin título"} 
                active={params.id === doc.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer: Configuración */}
      <div className="p-4 mt-auto border-t border-orion-border dark:border-slate-800">
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
function SidebarLink({ href, icon, label, active }: { href: string, icon: any, label: string, active: boolean }) {
  return (
    <Link 
      href={href}
      className={`
        flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-all duration-200
        ${active 
          ? "bg-white dark:bg-slate-800 text-orion-primary shadow-sm border border-slate-200 dark:border-slate-700 font-semibold" 
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