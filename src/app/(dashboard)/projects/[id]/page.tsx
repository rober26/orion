"use client";
import { use, useEffect, useState } from "react";
import ProjectSidebar from "@/src/components/projects/ProjectSidebar";
import { LayoutDashboard, FileText, CheckSquare, Users, Settings } from "lucide-react";

export default function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/detail?id=${id}`); // Necesitaremos esta ruta o ajustar la existente
        const data = await res.json();
        setProject(data);
      } catch (error) {
        console.error("Error al cargar proyecto:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  if (loading) return <div className="p-10">Cargando proyecto...</div>;

  return (
    <div className="flex h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* El Sidebar que creamos antes */}
      <ProjectSidebar />

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
             <div 
               className="w-4 h-4 rounded-full" 
               style={{ backgroundColor: project?.color || "#3b82f6" }} 
             />
             <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Proyecto</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {project?.name || "Cargando..."}
          </h1>
          <p className="text-slate-500 mt-2">{project?.description}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Aquí irán widgets rápidos de resumen */}
          <StatCard icon={<FileText />} label="Documentos" value={project?._count?.documents || 0} color="text-blue-500" />
          <StatCard icon={<CheckSquare />} label="Tareas Pendientes" value={project?._count?.tasks || 0} color="text-purple-500" />
          <StatCard icon={<Users />} label="Colaboradores" value={1} color="text-emerald-500" />
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">Actividad reciente</h2>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 text-center text-slate-400 italic">
            Próximamente: Timeline de actividad del proyecto
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-orion-border dark:border-slate-800 shadow-sm">
      <div className={`mb-4 ${color}`}>{icon}</div>
      <div className="text-3xl font-black mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
    </div>
  );
}