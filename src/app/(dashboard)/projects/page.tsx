"use client";
import { useEffect, useState } from "react";
import { FolderKanban, Plus, MoreHorizontal, FileText, LayoutGrid, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  _count?: {
    documents: number;
    tasks: number;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();

      if (!res.ok) {
        throw new Error((data as { error?: string })?.error || "No se pudieron cargar los proyectos");
      }

      setProjects(Array.isArray(data) ? (data as Project[]) : []);
    } catch (error) {
      console.error("Error cargando proyectos:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    const name = prompt("Nombre del nuevo proyecto:");
    if (!name) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          description: "Nuevo proyecto",
          color: "#3b82f6",
        }),
      });

      if (!res.ok) throw new Error("No se pudo crear el proyecto");

      const newProject = await res.json();
      
      setProjects((prev) => [newProject, ...prev]);
      router.push(`/projects/${newProject.id}`);
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al crear proyecto";
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            Proyectos
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Gestiona tus espacios de trabajo y objetivos.
          </p>
        </div>
        
        <button 
          onClick={handleCreateProject}
          disabled={isCreating}
          className="btn-primary px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed"
        >
          {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
          {isCreating ? "Creando..." : "Nuevo Proyecto"}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           [1, 2, 3].map((i) => (
             <div key={i} className="h-44 surface-soft animate-pulse rounded-[2rem]" />
            ))
        ) : projects.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-orion-border dark:border-orion-dark-border rounded-[2rem]">
            <FolderKanban className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">No hay proyectos todavía. ¡Crea el primero!</p>
          </div>
        ) : (
          projects.map((project) => (
            <div 
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
              className="group surface-panel p-6 rounded-[2rem] hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
            >
              <div 
                className="absolute top-0 left-0 w-2 h-full transition-all group-hover:w-3" 
                style={{ backgroundColor: project.color || '#3b82f6' }} 
              />
              
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-orion-primary">
                  <FolderKanban size={24} />
                </div>
                <button className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 transition-colors">
                  <MoreHorizontal size={20}/>
                </button>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 truncate">
                {project.name}
              </h3>
              
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-orion-dark-border text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-400" /> 
                  {project._count?.documents || 0} Docs
                </span>
                <span className="flex items-center gap-1.5">
                  <LayoutGrid size={14} className="text-purple-400" /> 
                  {project._count?.tasks || 0} Tareas
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
