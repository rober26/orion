"use client";
import { useEffect, useState } from "react";
import { FolderKanban, Plus, MoreHorizontal, LayoutGrid, Loader2, X, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isArchived?: boolean;
  _count?: {
    tasks: number;
    users: number;
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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
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

  useEffect(() => {
    const onGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-project-menu='true']")) {
        return;
      }

      setOpenMenu(null);
    };

    window.addEventListener("pointerdown", onGlobalPointerDown);
    return () => window.removeEventListener("pointerdown", onGlobalPointerDown);
  }, []);

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

  const deleteProject = async (project: Project) => {
    if (isUpdatingProject) {
      return;
    }

    setIsUpdatingProject(project.id);
    setListError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}?permanent=true`, {
        method: "DELETE",
      });

      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo eliminar el proyecto");
      }

      setProjects((prev) => prev.filter((item) => item.id !== project.id));
      setProjectToDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el proyecto";
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
    <div className="app-page">
      <div className="app-page-content">
      <header className="page-head flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title leading-none">
            Proyectos
          </h1>
          <p className="page-subtitle">
            Gestiona tus espacios de trabajo y objetivos.
          </p>
        </div>
        
        <button
          onClick={openCreateModal}
          disabled={isCreating}
          className="btn-primary min-h-10 px-6 py-3 rounded-2xl font-bold disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          Nuevo Proyecto
        </button>
      </header>

      <section className="section-panel space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {PROJECT_STATUS_FILTERS.map((filterOption) => (
            <button
              key={filterOption.value}
              type="button"
              onClick={() => setStatusFilter(filterOption.value)}
              className={`filter-chip min-h-10 ${
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
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {listError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
           [1, 2, 3].map((i) => (
             <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
            ))
        ) : projects.length === 0 ? (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-orion-border py-20 text-center dark:border-orion-dark-border">
            <FolderKanban className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">No hay proyectos todavía. ¡Crea el primero!</p>
          </div>
        ) : (
          projects.map((project) => (
            <div 
              key={project.id}
              onContextMenu={(event) => {
                event.preventDefault();
                setOpenMenu(project.id);
              }}
              onClick={() => router.push(`/projects/${project.id}`)}
                className="group surface-panel relative cursor-pointer overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
            <div 
                className="absolute top-0 left-0 w-2 h-full transition-all group-hover:w-3" 
                style={{ backgroundColor: project.color || "#1e3a8a" }} 
               />
              
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-orion-primary">
                    <FolderKanban size={24} />
                  </div>
                 <div className="relative" data-project-menu="true">
                   <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenu((prev) => (prev === project.id ? null : project.id));
                      }}
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                      aria-haspopup="menu"
                      aria-expanded={openMenu === project.id}
                      aria-label={`Acciones de ${project.name}`}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                   {openMenu === project.id && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-2xl border border-orion-border bg-white shadow-xl dark:border-orion-dark-border dark:bg-slate-900">
                       <button
                         type="button"
                         onClick={(event) => {
                           event.stopPropagation();
                           setOpenMenu(null);
                           openEditModal(project);
                         }}
                         className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                       >
                         Editar
                       </button>
                       <button
                         type="button"
                         onClick={(event) => {
                           event.stopPropagation();
                           setOpenMenu(null);
                           void toggleProjectArchivedStatus(project);
                         }}
                         disabled={isUpdatingProject === project.id}
                         className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
                       >
                         {project.isArchived ? "Restaurar" : "Archivar"}
                       </button>
                       <button
                         type="button"
                         onClick={(event) => {
                           event.stopPropagation();
                           setOpenMenu(null);
                           setProjectToDelete(project);
                         }}
                         disabled={isUpdatingProject === project.id}
                         className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950/30"
                       >
                         Borrar
                       </button>
                     </div>
                   )}
                 </div>
                </div>

                <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white truncate">
                  {project.name}
                </h3>

               {project.isArchived && (
                 <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                   Archivado
                 </span>
               )}
                
                 <div className="mt-6 flex items-center gap-4 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500 dark:border-orion-dark-border">
                  <span className="flex items-center gap-1.5">
                    <LayoutGrid size={14} className="text-orion-primary" />
                    {project._count?.tasks || 0} Tareas
                  </span>
                 <span className="flex items-center gap-1.5">
                   <Users size={14} className="text-emerald-500" />
                   {(project._count?.users || 0) + 1} Usuarios
                 </span>
               </div>
              </div>
           ))
        )}
        </div>
      </section>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="surface-panel w-full max-w-xl rounded-3xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Crear proyecto</h2>
                 <p className="mt-1 text-sm text-slate-500">Define un nombre y una descripción para tu nuevo espacio.</p>
              </div>
              <button
                onClick={closeCreateModal}
                disabled={isCreating}
                  className="icon-btn min-h-10 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
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
                 <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Descripción</span>
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
                 className="btn-secondary min-h-10 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreating}
                 className="btn-primary min-h-10 rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="surface-panel w-full max-w-xl rounded-3xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Editar proyecto</h2>
                 <p className="mt-1 text-sm text-slate-500">Actualiza nombre y descripción.</p>
              </div>
              <button
                onClick={closeEditModal}
                disabled={isCreating}
                  className="icon-btn min-h-10 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
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
                 <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Descripción</span>
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
                 className="btn-secondary min-h-10 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveProjectEdit}
                disabled={isCreating}
                 className="btn-primary min-h-10 rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed"
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

      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="surface-panel w-full max-w-md rounded-3xl p-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Eliminar proyecto</h2>
            <p className="mt-2 text-sm text-slate-500">
               Se eliminará definitivamente <span className="font-semibold text-slate-700 dark:text-slate-200">{projectToDelete.name}</span>. Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={isUpdatingProject === projectToDelete.id}
                 className="btn-secondary min-h-10 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void deleteProject(projectToDelete)}
                disabled={isUpdatingProject === projectToDelete.id}
                className="rounded-xl border border-red-300 bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 dark:border-red-800"
              >
                {isUpdatingProject === projectToDelete.id ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Eliminando...
                  </span>
                ) : (
                  "Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
