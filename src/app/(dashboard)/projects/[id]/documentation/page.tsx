"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProjectSidebar from "@/src/components/projects/ProjectSidebar";
import { Book, FileText, Folder, Link2, Loader2, Plus, Unlink } from "lucide-react";

interface ProjectFolder {
  id: string;
  name: string;
  notebooks: Array<{
    id: string;
    title: string;
    color: string | null;
    _count: { documents: number };
  }>;
}

interface ProjectDocument {
  id: string;
  title: string;
  updatedAt: string;
  notebookId: string | null;
}

interface RelatedNotebook {
  id: string;
  title: string;
  color: string | null;
  updatedAt: string;
  documents: Array<{
    id: string;
    title: string;
    updatedAt: string;
    projectId: string | null;
  }>;
}

interface NotebookOption {
  id: string;
  title: string;
}

interface DocumentationResponse {
  project: {
    folders: ProjectFolder[];
    documents: ProjectDocument[];
  };
  related: {
    notebooks: RelatedNotebook[];
  };
}

interface ApiError {
  error?: string;
}

interface ProjectPermissions {
  permissions?: {
    canEdit?: boolean;
  };
}

export default function ProjectDocumentationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [data, setData] = useState<DocumentationResponse | null>(null);
  const [notebookOptions, setNotebookOptions] = useState<NotebookOption[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedNotebookId, setSelectedNotebookId] = useState("");
  const [canEdit, setCanEdit] = useState(false);

  const linkedNotebookIds = useMemo(
    () => new Set(data?.related.notebooks.map((notebook) => notebook.id) || []),
    [data],
  );

  const availableNotebooks = useMemo(
    () => notebookOptions.filter((option) => !linkedNotebookIds.has(option.id)),
    [linkedNotebookIds, notebookOptions],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const [docRes, notebooksRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${id}/documentation`),
        fetch("/api/notebooks"),
        fetch(`/api/projects/${id}`, { cache: "no-store" }),
      ]);

      const [docPayload, notebooksPayload, projectPayload] = (await Promise.all([
        docRes.json(),
        notebooksRes.json(),
        projectRes.json(),
      ])) as [
        DocumentationResponse | ApiError,
        Array<{ id: string; title: string }> | ApiError,
        ProjectPermissions & ApiError,
      ];

      if (!docRes.ok) {
        throw new Error((docPayload as ApiError).error || "No se pudo cargar la documentación");
      }

      if (!notebooksRes.ok) {
        throw new Error((notebooksPayload as ApiError).error || "No se pudo cargar cuadernos");
      }

      if (!projectRes.ok) {
        throw new Error(projectPayload.error || "No se pudieron cargar permisos");
      }

      setData(docPayload as DocumentationResponse);
      setNotebookOptions((Array.isArray(notebooksPayload) ? notebooksPayload : []).map((item) => ({ id: item.id, title: item.title })));
      setCanEdit(Boolean(projectPayload.permissions?.canEdit));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo cargar la documentación");
      setData(null);
      setNotebookOptions([]);
      setCanEdit(false);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const createProjectDocument = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Documento nuevo" }),
      });

      const payload = (await res.json()) as { id?: string } & ApiError;
      if (!res.ok || !payload.id) {
        throw new Error(payload.error || "No se pudo crear el documento");
      }

      window.location.href = `/notebooks?doc=${payload.id}`;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear el documento");
    } finally {
      setSaving(false);
    }
  };

  const createProjectFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo crear la carpeta");
      }

      setNewFolderName("");
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear la carpeta");
    } finally {
      setSaving(false);
    }
  };

  const linkNotebook = async () => {
    if (!selectedNotebookId) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/notebooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId: selectedNotebookId }),
      });

      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo vincular el cuaderno");
      }

      setSelectedNotebookId("");
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo vincular el cuaderno");
    } finally {
      setSaving(false);
    }
  };

  const unlinkNotebook = async (notebookId: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/notebooks/${notebookId}`, { method: "DELETE" });
      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo desvincular");
      }

      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo desvincular");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full rounded-[1rem] bg-orion-surface dark:bg-slate-950 overflow-hidden">
      <ProjectSidebar />

      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <section className="mx-auto w-full max-w-6xl space-y-6">
          <header className="page-head">
            <h1 className="page-title">Documentación</h1>
            <p className="page-subtitle">
              Gestiona documentación de proyecto y documentación relacionada en una sola vista.
            </p>
            {!canEdit && (
              <p className="mt-2 inline-flex items-center rounded-full bg-slate-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Solo lectura
              </p>
            )}
          </header>

          {feedback && (
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {feedback}
            </div>
          )}

          {loading ? (
            <div className="inline-flex items-center gap-2 text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Cargando documentación...
            </div>
          ) : !data ? (
            <div className="rounded-xl border border-dashed border-orion-border px-4 py-10 text-center text-sm text-slate-500 dark:border-orion-dark-border">
              No se pudo cargar la documentación.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="section-panel space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Documentación de proyecto</h2>
                  <p className="text-sm text-slate-500">Recursos propios de este proyecto.</p>
                </div>

                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void createProjectDocument()}
                      disabled={saving}
                      className="btn-primary rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-70"
                    >
                      <Plus size={14} /> Documento
                    </button>

                    <div className="flex gap-2 flex-1 min-w-60">
                      <input
                        value={newFolderName}
                        onChange={(event) => setNewFolderName(event.target.value)}
                        placeholder="Nueva carpeta"
                        className="input-orion flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => void createProjectFolder()}
                        disabled={saving}
                        className="rounded-xl border border-orion-border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-orion-dark-border dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Folder size={14} /> Crear
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Carpetas</h3>
                  {data.project.folders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-orion-border px-3 py-6 text-center text-sm text-slate-500 dark:border-orion-dark-border">
                      No hay carpetas del proyecto.
                    </div>
                  ) : (
                    data.project.folders.map((folder) => (
                      <div key={folder.id} className="rounded-xl border border-orion-border dark:border-orion-dark-border p-3">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                          <Folder size={14} className="text-amber-500" />
                          {folder.name}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{folder.notebooks.length} cuadernos</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Documentos</h3>
                  {data.project.documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-orion-border px-3 py-6 text-center text-sm text-slate-500 dark:border-orion-dark-border">
                      No hay documentos del proyecto.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.project.documents.map((document) => (
                        <Link
                          key={document.id}
                          href={`/notebooks?doc=${document.id}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-orion-border dark:border-orion-dark-border px-3 py-2 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-white">{document.title}</p>
                            <p className="text-xs text-slate-500">{document.notebookId ? "Vinculado a cuaderno" : "Documento suelto"}</p>
                          </div>
                          <FileText size={14} className="text-slate-500" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="section-panel space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Documentación relacionada</h2>
                  <p className="text-sm text-slate-500">Cuadernos vinculados y sus documentos relacionados.</p>
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <select
                      value={selectedNotebookId}
                      onChange={(event) => setSelectedNotebookId(event.target.value)}
                      className="select-orion flex-1"
                    >
                      <option value="">Selecciona cuaderno para vincular</option>
                      {availableNotebooks.map((notebook) => (
                        <option key={notebook.id} value={notebook.id}>
                          {notebook.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void linkNotebook()}
                      disabled={saving || !selectedNotebookId}
                      className="btn-primary rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-70"
                    >
                      <Link2 size={14} /> Vincular
                    </button>
                  </div>
                )}

                {data.related.notebooks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-orion-border px-3 py-8 text-center text-sm text-slate-500 dark:border-orion-dark-border">
                    No hay cuadernos relacionados.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.related.notebooks.map((notebook) => (
                      <div key={notebook.id} className="rounded-xl border border-orion-border dark:border-orion-dark-border p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="inline-flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                            <Book size={14} className="text-blue-500" /> {notebook.title}
                          </p>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => void unlinkNotebook(notebook.id)}
                              disabled={saving}
                              className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                              <Unlink size={12} />
                            </button>
                          )}
                        </div>

                        {notebook.documents.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-orion-border px-3 py-4 text-xs text-slate-500 dark:border-orion-dark-border">
                            Sin documentos relacionados en este cuaderno.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {notebook.documents.map((document) => (
                              <Link
                                key={document.id}
                                href={`/notebooks?doc=${document.id}`}
                                className="flex items-center justify-between gap-2 rounded-lg border border-orion-border dark:border-orion-dark-border px-2.5 py-2 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{document.title}</p>
                                  <p className="text-[11px] text-slate-500">
                                    {document.projectId ? "Vinculado a otro proyecto" : "Documento global"}
                                  </p>
                                </div>
                                <FileText size={13} className="text-slate-500" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
