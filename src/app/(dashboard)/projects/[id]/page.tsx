"use client";
import { use, useEffect, useState } from "react";
import ProjectSidebar from "@/src/components/projects/ProjectSidebar";
import { FileText, CheckSquare, Users } from "lucide-react";

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
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
        const res = await fetch(`/api/projects/detail?id=${id}`);
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
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {project.name}
          </h1>
          <p className="text-slate-500 mt-2">{project.description}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard icon={<FileText />} label="Documentos" value={project._count?.documents || 0} color="text-blue-500" />
          <StatCard icon={<CheckSquare />} label="Tareas Pendientes" value={project._count?.tasks || 0} color="text-purple-500" />
          <StatCard icon={<Users />} label="Colaboradores" value={1} color="text-emerald-500" />
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">Actividad reciente</h2>
          <div className="surface-soft rounded-[2rem] p-8 text-center text-slate-400 italic">
            Próximamente: Timeline de actividad del proyecto
          </div>
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
