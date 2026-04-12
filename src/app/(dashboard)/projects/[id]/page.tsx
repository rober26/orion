"use client";
import { use, useEffect, useState } from "react";
import ProjectSidebar from "@/src/components/projects/ProjectSidebar";
import { FileText, CheckSquare, Users } from "lucide-react";

interface ProjectActivityItem {
  id: string;
  title: string;
  updatedAt: string;
  type: "task" | "document";
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isArchived: boolean;
  membersCount: number;
  tasks: Array<{ id: string; title: string; updatedAt: string }>;
  documents: Array<{ id: string; title: string; updatedAt: string }>;
  _count?: {
    documents: number;
    tasks: number;
  };
}

export default function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          setError(payload.error ?? "Acceso denegado");
          setProject(null);
          return;
        }

        const data = await res.json();
        setProject(data);
      } catch (error) {
        console.error("Error al cargar proyecto:", error);
        setError("No se pudo cargar el proyecto");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  if (loading) return <div className="p-10">Cargando proyecto...</div>;

  if (error || !project) {
    return <div className="p-10 text-red-400">{error ?? "Acceso denegado"}</div>;
  }

  const recentActivity: ProjectActivityItem[] = [
    ...project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      updatedAt: task.updatedAt,
      type: "task" as const,
    })),
    ...project.documents.map((document) => ({
      id: document.id,
      title: document.title,
      updatedAt: document.updatedAt,
      type: "document" as const,
    })),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  return (
    <div className="flex h-full bg-orion-surface dark:bg-slate-950 overflow-hidden">
      <ProjectSidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8">
           <div className="flex items-center gap-3 mb-2">
              <div
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: project.color || "#3b82f6" }} 
              />
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Proyecto</span>
              {project.isArchived && (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  Archivado
                </span>
              )}
           </div>
           <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
             {project.name}
           </h1>
          <p className="text-slate-500 mt-2">{project.description}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard icon={<FileText />} label="Documentos" value={project._count?.documents || 0} color="text-blue-500" />
          <StatCard icon={<CheckSquare />} label="Tareas Pendientes" value={project._count?.tasks || 0} color="text-purple-500" />
          <StatCard icon={<Users />} label="Colaboradores" value={project.membersCount || 1} color="text-emerald-500" />
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">Actividad reciente</h2>
          {recentActivity.length === 0 ? (
            <div className="surface-soft rounded-[2rem] p-8 text-center text-slate-400 italic">
              Aun no hay actividad reciente en este proyecto.
            </div>
          ) : (
            <div className="surface-panel rounded-[2rem] p-4 space-y-2">
              {recentActivity.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-orion-border dark:border-orion-dark-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-xs font-medium text-slate-500">
                      {item.type === "task" ? "Tarea" : "Documento"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(item.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="surface-panel p-6 rounded-[2rem]">
      <div className={`mb-4 ${color}`}>{icon}</div>
      <div className="text-3xl font-black mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
    </div>
  );
}
