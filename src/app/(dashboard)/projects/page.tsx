"use client";
import { useEffect, useState } from "react";
import { FolderKanban, Plus, MoreHorizontal, FileText, LayoutGrid, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isArchived?: boolean;
  _count?: {
    documents: number;
    tasks: number;
  };
}

interface ApiError {
  error?: string;
}

const DEFAULT_PROJECT_COLOR = "#3b82f6";
const PROJECT_STATUS_FILTERS = [
  { label: "Activos", value: "active" },
  { label: "Archivados", value: "archived" },
  { label: "Todos", value: "all" },
] as const;

type ProjectStatusFilter = (typeof PROJECT_STATUS_FILTERS)[number]["value"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("active");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const router = useRouter();

  const fetchProjects = async (status: ProjectStatusFilter) => {
    try {
      setListError(null);
      const res = await fetch(`/api/projects?status=${status}`);
      const data = (await res.json()) as Project[] | ApiError;

      if (!res.ok) {
        throw new Error((data as ApiError)?.error || "No se pudieron cargar los proyectos");
      }

      setProjects(Array.isArray(data) ? (data as Project[]) : []);
    } catch (error) {
      console.error("Error cargando proyectos:", error);
      setProjects([]);
      setListError("No se pudieron cargar los proyectos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void fetchProjects(statusFilter);
  }, [statusFilter]);

  const resetCreateModal = () => {
    setNewProjectName("");
    setNewProjectDescription("");
    setCreateError(null);
  };

  const openCreateModal = () => {
    resetCreateModal();
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) {
      return;
    }

    setIsCreateModalOpen(false);
    resetCreateModal();
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    const description = newProjectDescription.trim();

    if (!name) {
      setCreateError("El nombre del proyecto es obligatorio.");
      return;
    }

    if (name.length > 100) {
      setCreateError("El nombre no puede superar 100 caracteres.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          color: DEFAULT_PROJECT_COLOR,
        }),
      });

      const payload = (await res.json()) as Project | ApiError;
      if (!res.ok) {
        throw new Error((payload as ApiError)?.error || "No se pudo crear el proyecto");
      }

      const newProject = payload as Project;
      
      setProjects((prev) => [newProject, ...prev]);
      setIsCreateModalOpen(false);
      resetCreateModal();
      router.push(`/projects/${newProject.id}`);
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al crear proyecto";
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleProjectArchivedStatus = async (project: Project) => {
    if (isUpdatingProject) {
      return;
    }

    const nextArchived = !project.isArchived;
    setIsUpdatingProject(project.id);
    setListError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: nextArchived }),
      });

      const payload = (await res.json()) as Project | ApiError;
      if (!res.ok) {
        throw new Error((payload as ApiError)?.error || "No se pudo actualizar el proyecto");
      }

      if (statusFilter === "all") {
        setProjects((prev) =>
          prev.map((item) =>
            item.id === project.id
              ? {
                  ...item,
                  isArchived: nextArchived,
                }
              : item,
          ),
        );
      } else {
        setProjects((prev) => prev.filter((item) => item.id !== project.id));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el proyecto";
      setListError(message);
    } finally {
      setIsUpdatingProject(null);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProjectId(project.id);
    setEditProjectName(project.name || "");
    setEditProjectDescription(project.description || "");
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (isCreating) {
      return;
    }

    setIsEditModalOpen(false);
    setEditingProjectId(null);
    setEditProjectName("");
    setEditProjectDescription("");
    setEditError(null);
  };

  const saveProjectEdit = async () => {
    if (!editingProjectId) {
      return;
    }

    const name = editProjectName.trim();
    const description = editProjectDescription.trim();

    if (!name) {
      setEditError("El nombre del proyecto es obligatorio.");
      return;
    }

    setIsCreating(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/projects/${editingProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      const payload = (await res.json()) as Project | ApiError;
      if (!res.ok) {
        throw new Error((payload as ApiError)?.error || "No se pudo actualizar el proyecto");
      }

      setProjects((prev) =>
        prev.map((project) =>
          project.id === editingProjectId
            ? {
                ...project,
                name,
                description,
              }
            : project,
        ),
      );

      closeEditModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el proyecto";
      setEditError(message);
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
          onClick={openCreateModal}
          disabled={isCreating}
          className="btn-primary px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          Nuevo Proyecto
        </button>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {PROJECT_STATUS_FILTERS.map((filterOption) => (
          <button
            key={filterOption.value}
            type="button"
            onClick={() => setStatusFilter(filterOption.value)}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              statusFilter === filterOption.value
                ? "bg-orion-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {filterOption.label}
          </button>
        ))}
      </div>

      {listError && (
        <div className="mb-6 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {listError}
        </div>
      )}

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
                 <div className="flex flex-col items-end gap-1">
                   <button
                     type="button"
                     onClick={(event) => {
                       event.stopPropagation();
                       openEditModal(project);
                     }}
                     className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
                   >
                     <MoreHorizontal size={16} /> Editar
                   </button>
                   <button
                     type="button"
                     onClick={(event) => {
                       event.stopPropagation();
                       void toggleProjectArchivedStatus(project);
                     }}
                     disabled={isUpdatingProject === project.id}
                     className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white disabled:opacity-60"
                   >
                     {isUpdatingProject === project.id ? <Loader2 size={14} className="animate-spin" /> : null}
                     {project.isArchived ? "Restaurar" : "Archivar"}
                   </button>
                 </div>
                </div>

               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 truncate">
                 {project.name}
               </h3>

               {project.isArchived && (
                 <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                   Archivado
                 </span>
               )}
                
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="surface-panel w-full max-w-xl rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Crear proyecto</h2>
                <p className="text-sm text-slate-500 mt-1">Define un nombre y una descripcion para tu nuevo espacio.</p>
              </div>
              <button
                onClick={closeCreateModal}
                disabled={isCreating}
                className="icon-btn rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Nombre</span>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  placeholder="Ej. Lanzamiento Q3"
                  className="input-orion"
                  maxLength={100}
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Descripcion</span>
                <textarea
                  value={newProjectDescription}
                  onChange={(event) => setNewProjectDescription(event.target.value)}
                  placeholder="Objetivo, alcance o contexto del proyecto"
                  className="input-orion min-h-28 resize-none"
                  maxLength={300}
                />
              </label>

              {createError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  {createError}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={isCreating}
                className="rounded-xl border border-orion-border px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-orion-dark-border dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreating}
                className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Creando...
                  </span>
                ) : (
                  "Crear proyecto"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="surface-panel w-full max-w-xl rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Editar proyecto</h2>
                <p className="text-sm text-slate-500 mt-1">Actualiza nombre y descripcion.</p>
              </div>
              <button
                onClick={closeEditModal}
                disabled={isCreating}
                className="icon-btn rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Nombre</span>
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(event) => setEditProjectName(event.target.value)}
                  className="input-orion"
                  maxLength={100}
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Descripcion</span>
                <textarea
                  value={editProjectDescription}
                  onChange={(event) => setEditProjectDescription(event.target.value)}
                  className="input-orion min-h-28 resize-none"
                  maxLength={300}
                />
              </label>

              {editError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  {editError}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isCreating}
                className="rounded-xl border border-orion-border px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-orion-dark-border dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveProjectEdit}
                disabled={isCreating}
                className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  "Guardar cambios"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
