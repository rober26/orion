"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FileExplorer from "@/src/components/notebooks/FileExplorer";
import Editor from "@/src/components/notebooks/Editor";
import ExplorerPanel from "@/src/components/notebooks/ExplorerPanel";
import QuickNoteModal, { type QuickNoteDraft } from "@/src/components/notes/QuickNoteModal";
import { BookOpen, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

type QuickNote = {
  id: string;
  title: string;
  content: string;
  color: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
};

function NotebooksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDocumentId = searchParams.get("doc");
  const selectedFolderId = searchParams.get("folder");
  const selectedNotebookId = searchParams.get("notebook");
  const highlightedTab = searchParams.get("tab");
  const [isCreating, setIsCreating] = useState(false);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesSearch, setNotesSearch] = useState("");
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const handleCreateNote = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const response = await fetch("/api/notebooks/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Nueva nota sin título",
          notebookId: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Fallo al crear la nota en el servidor.");
      }

      router.refresh();
      router.push(`/notebooks?doc=${result.id}`);

    } catch (error: unknown) {
      console.error("Error al crear nota:", error);
      const message = error instanceof Error ? error.message : "Ocurrio un error inesperado.";
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  const loadQuickNotes = useCallback(async () => {
    try {
      setNotesLoading(true);
      setNotesError(null);

      const query = new URLSearchParams();
      query.set("archived", "false");
      query.set("unassigned", "true");
      if (notesSearch.trim()) {
        query.set("q", notesSearch.trim());
      }

      const response = await fetch(`/api/notes?${query.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as QuickNote[] | { error?: string };

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "No se pudieron cargar notas rapidas");
      }

      setQuickNotes(Array.isArray(payload) ? payload.slice(0, 18) : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar notas rapidas";
      setNotesError(message);
      setQuickNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [notesSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadQuickNotes();
    }, 180);

    return () => clearTimeout(timer);
  }, [loadQuickNotes]);

  const openEditModal = (note: QuickNote) => setEditingNote(note);

  const saveEditedNote = async (draft: QuickNoteDraft) => {
    if (!editingNote || savingNote) {
      return;
    }

    try {
      setSavingNote(true);
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          content: draft.content,
          color: draft.color,
          projectId: draft.projectId,
        }),
      });

      const payload = (await response.json()) as QuickNote | { error?: string };
      if (!response.ok || !("id" in payload)) {
        throw new Error((payload as { error?: string }).error || "No se pudo guardar la nota");
      }

      const updated = payload as QuickNote;
      setQuickNotes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingNote(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la nota";
      setNotesError(message);
    } finally {
      setSavingNote(false);
    }
  };

  const deleteQuickNote = async (noteId: string) => {
    if (deletingNoteId === noteId) {
      return;
    }

    try {
      setDeletingNoteId(noteId);
      const response = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo eliminar la nota");
      }

      setQuickNotes((prev) => prev.filter((item) => item.id !== noteId));
      if (editingNote?.id === noteId) {
        setEditingNote(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la nota";
      setNotesError(message);
    } finally {
      setDeletingNoteId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 surface-panel rounded-[2rem] overflow-hidden">
      <FileExplorer collapsible />

      {selectedDocumentId ? (
        <Editor documentId={selectedDocumentId} />
      ) : selectedFolderId || selectedNotebookId ? (
        <ExplorerPanel folderId={selectedFolderId} notebookId={selectedNotebookId} />
      ) : highlightedTab === "quick-notes" ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <section className="surface-panel h-full min-h-0 rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Notas rapidas</h2>
            </div>

            <label className="relative mb-3 block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={notesSearch}
                onChange={(event) => setNotesSearch(event.target.value)}
                placeholder="Buscar notas rapidas"
                className="input-orion pl-9"
              />
            </label>

            {notesError ? (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
                {notesError}
              </div>
            ) : notesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : quickNotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-orion-border px-4 py-8 text-center dark:border-orion-dark-border">
                <p className="text-sm text-slate-500">No hay notas rapidas por ahora.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {quickNotes.map((note) => (
                  <article
                    key={note.id}
                    className="group relative min-h-[140px] overflow-hidden rounded-2xl border border-black/10 p-3 shadow-[0_6px_14px_rgba(15,23,42,0.1)]"
                    style={{ backgroundColor: note.color }}
                  >
                    <div className="flex min-h-[112px] flex-col pb-10">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 text-sm font-bold text-slate-900 [overflow-wrap:anywhere] break-all">
                          {note.title || "Nota sin titulo"}
                        </h3>
                        <span className="shrink-0 text-[10px] font-semibold text-slate-600">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="line-clamp-5 min-w-0 break-all whitespace-pre-wrap text-xs leading-relaxed text-slate-700 [overflow-wrap:anywhere]">
                        {note.content || "(Sin contenido)"}
                      </p>
                    </div>
                    <div className="absolute bottom-3 right-3 flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEditModal(note)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/75 px-2 py-1 text-[11px] font-semibold text-slate-700"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteQuickNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500/85 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-70"
                      >
                        {deletingNoteId === note.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8">
          <section className="surface-panel flex h-full min-h-0 items-center justify-center rounded-3xl p-6 text-center">
            <div className="mx-auto flex w-full max-w-xl flex-col items-center">
              <div className="relative mb-8 inline-flex">
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-orion-primary/10 text-orion-primary transition-all duration-500 hover:scale-110 dark:bg-orion-primary/20">
                  {isCreating ? <Loader2 className="animate-spin" size={48} /> : <BookOpen size={48} />}
                </div>
                {isCreating && (
                  <div className="absolute -bottom-2 -right-2 rounded-full border border-orion-border bg-orion-surface p-2 shadow-xl dark:border-orion-dark-border dark:bg-slate-900">
                    <Loader2 className="animate-spin text-orion-primary" size={20} />
                  </div>
                )}
              </div>
              <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white">Tu Cerebro Digital</h1>
              <p className="mb-10 text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Organiza tus ideas de forma jerarquica. Crea una nota para empezar a construir tu red de conocimiento.
              </p>
              <div className="grid w-full max-w-sm grid-cols-1 gap-4">
                <QuickAction
                  icon={<Plus size={22} />}
                  label={isCreating ? "Sincronizando..." : "Nueva Nota"}
                  onClick={handleCreateNote}
                  disabled={isCreating}
                  primary
                />
              </div>
            </div>
          </section>
        </div>
      )}

      <QuickNoteModal
        open={editingNote !== null}
        title="Editar nota rapida"
        initialValue={
          editingNote
            ? {
                title: editingNote.title,
                content: editingNote.content,
                color: editingNote.color,
                projectId: editingNote.project?.id || null,
              }
            : undefined
        }
        submitting={savingNote}
        error={notesError}
        onClose={() => {
          if (!savingNote) {
            setEditingNote(null);
          }
        }}
        onSave={(draft) => {
          void saveEditedNote(draft);
        }}
      />
    </div>
  );
}

export default function NotebooksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 surface-panel rounded-[2rem] overflow-hidden items-center justify-center text-slate-300">
          <Loader2 className="animate-spin" size={20} />
        </div>
      }
    >
      <NotebooksContent />
    </Suspense>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

function QuickAction({ icon, label, onClick, disabled, primary }: QuickActionProps) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-3 p-5 rounded-2xl border font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait
        ${primary 
          ? "bg-orion-primary text-white border-transparent hover:bg-blue-700 shadow-lg shadow-blue-500/20" 
          : "bg-orion-surface dark:bg-slate-800/50 border-orion-border dark:border-orion-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        }
      `}
    >
      <span className={primary ? "text-white" : "text-orion-primary"}>
        {icon}
      </span>
      {label}
    </button>
  );
}
