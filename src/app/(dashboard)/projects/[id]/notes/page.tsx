"use client";

import { use, useEffect, useRef, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, Pencil, StickyNote, Trash2, X } from "lucide-react";
import ProjectSidebar from "@/src/components/projects/ProjectSidebar";
import QuickNoteModal, { type QuickNoteDraft } from "@/src/components/notes/QuickNoteModal";

interface QuickNoteItem {
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
}

interface ProjectPermissionsResponse {
  permissions?: {
    canEdit?: boolean;
  };
  error?: string;
}

export default function ProjectNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [notes, setNotes] = useState<QuickNoteItem[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const [editingNote, setEditingNote] = useState<QuickNoteItem | null>(null);
  const [viewingNote, setViewingNote] = useState<QuickNoteItem | null>(null);
  const [viewingTitle, setViewingTitle] = useState("");
  const [viewingContent, setViewingContent] = useState("");
  const [savingViewingNote, setSavingViewingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [isSorting, setIsSorting] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewingNoteRef = useRef(viewingNote);
  viewingNoteRef.current = viewingNote;
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const viewingTitleRef = useRef(viewingTitle);
  viewingTitleRef.current = viewingTitle;
  const viewingContentRef = useRef(viewingContent);
  viewingContentRef.current = viewingContent;
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = contentTextareaRef.current;
    if (!el) {
      return;
    }

    el.style.height = "0";
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.9)}px`;
  }, [viewingContent]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  );

  useEffect(() => {
    if (!viewingNote) {
      setViewingTitle("");
      setViewingContent("");
      return;
    }

    setViewingTitle(viewingNote.title || "");
    setViewingContent(viewingNote.content || "");
  }, [viewingNote]);

  useEffect(() => {
    const note = viewingNoteRef.current;
    if (!note || !canEditRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const currentNote = viewingNoteRef.current;
      if (!currentNote) {
        return;
      }

      setSavingViewingNote(true);
      fetch(`/api/notes/${currentNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: viewingTitleRef.current.slice(0, 120),
          content: viewingContentRef.current.slice(0, 10000),
        }),
      })
        .then((res) => res.json())
        .then((payload: QuickNoteItem | { error?: string }) => {
          if (!("id" in payload)) {
            throw new Error((payload as { error?: string }).error || "No se pudo guardar");
          }

          const updated = payload as QuickNoteItem;
          setNotes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          setViewingNote(updated);
        })
        .catch((err: Error) => {
          setNotesError(err.message || "No se pudo guardar");
        })
        .finally(() => {
          setSavingViewingNote(false);
        });
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [viewingTitle, viewingContent]);

  const persistOrder = (orderedIds: string[]) => {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(`project-notes-order:${id}`, JSON.stringify(orderedIds));
  };

  const applyStoredOrder = (incomingNotes: QuickNoteItem[]) => {
    if (typeof window === "undefined") {
      return incomingNotes;
    }

    const raw = localStorage.getItem(`project-notes-order:${id}`);
    if (!raw) {
      return incomingNotes;
    }

    try {
      const storedIds = JSON.parse(raw) as string[];
      const idSet = new Set(storedIds);
      const byId = new Map(incomingNotes.map((note) => [note.id, note]));
      const ordered = storedIds.map((storedId) => byId.get(storedId)).filter((note): note is QuickNoteItem => Boolean(note));
      const missing = incomingNotes.filter((note) => !idSet.has(note.id));
      return [...ordered, ...missing];
    } catch {
      return incomingNotes;
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setNotesLoading(true);
        setNotesError(null);

        const query = new URLSearchParams();
        query.set("archived", "false");
        query.set("projectId", id);

        const [notesRes, projectRes] = await Promise.all([
          fetch(`/api/notes?${query.toString()}`, { cache: "no-store" }),
          fetch(`/api/projects/${id}`, { cache: "no-store" }),
        ]);

        const notesPayload = (await notesRes.json()) as QuickNoteItem[] | { error?: string };
        const projectPayload = (await projectRes.json()) as ProjectPermissionsResponse;

        if (!notesRes.ok) {
          throw new Error((notesPayload as { error?: string }).error || "No se pudieron cargar notas");
        }

        if (!projectRes.ok) {
          throw new Error(projectPayload.error || "No se pudieron cargar permisos");
        }

        setCanEdit(Boolean(projectPayload.permissions?.canEdit));
        const loadedNotes = Array.isArray(notesPayload) ? notesPayload : [];
        setNotes(applyStoredOrder(loadedNotes));
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar notas";
        setNotesError(message);
        setNotes([]);
      } finally {
        setNotesLoading(false);
      }
    };

    void load();
  }, [id]);

  const openEdit = (note: QuickNoteItem) => {
    setEditingNote(note);
  };

  const saveEdited = async (draft: QuickNoteDraft) => {
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

      const payload = (await response.json()) as QuickNoteItem | { error?: string };
      if (!response.ok || !("id" in payload)) {
        throw new Error((payload as { error?: string }).error || "No se pudo guardar la nota");
      }

      const updated = payload as QuickNoteItem;
      setNotes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingNote(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la nota";
      setNotesError(message);
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (noteId: string) => {
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

      setNotes((prev) => {
        const next = prev.filter((item) => item.id !== noteId);
        persistOrder(next.map((item) => item.id));
        return next;
      });
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

  const handleDragEnd = (event: DragEndEvent) => {
    setIsSorting(false);

    if (!canEdit) {
      return;
    }

    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setNotes((current) => {
      const oldIndex = current.findIndex((note) => note.id === active.id);
      const newIndex = current.findIndex((note) => note.id === over.id);
      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      persistOrder(next.map((note) => note.id));
      return next;
    });
  };

  return (
    <div className="flex h-full rounded-[1rem] bg-orion-surface dark:bg-slate-950 overflow-hidden">
      <ProjectSidebar />

      <main className="app-workspace-main">
        <section className="section-panel-compact flex h-full min-h-0 flex-col">
          <div className="mb-4 flex items-center gap-2">
            <StickyNote size={18} className="text-orion-primary" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Notas del proyecto</h1>
            {!canEdit ? (
              <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Solo lectura
              </span>
            ) : null}
          </div>

          {notesError ? (
            <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
              {notesError}
            </div>
          ) : null}

          {notesLoading ? (
            <div className="flex flex-1 min-h-0 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Cargando notas...
            </div>
          ) : notes.length === 0 ? (
            <div className="surface-soft flex flex-1 min-h-0 items-center justify-center rounded-[2rem] p-8 text-center text-slate-400 italic">
              No hay notas para este proyecto.
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={() => setIsSorting(true)}
                onDragCancel={() => setIsSorting(false)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={notes.map((note) => note.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] auto-rows-[8px] gap-3">
                    {notes.map((note) => (
                      <SortableProjectNoteCard
                        key={note.id}
                        note={note}
                        isSorting={isSorting}
                        canEdit={canEdit}
                        deleting={deletingNoteId === note.id}
                        onOpen={() => setViewingNote(note)}
                        onEdit={() => openEdit(note)}
                        onDelete={() => void deleteNote(note.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </section>
      </main>

      <QuickNoteModal
        open={editingNote !== null}
        title="Editar nota del proyecto"
        initialValue={
          editingNote
            ? {
                title: editingNote.title,
                content: editingNote.content,
                color: editingNote.color,
                projectId: editingNote.project?.id || id,
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
          if (editingNote) {
            setViewingNote(null);
          }
          void saveEdited(draft);
        }}
      />

      {viewingNote ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-black/10 p-4 shadow-2xl" style={{ backgroundColor: viewingNote.color }}>
            <button
              type="button"
              onClick={() => setViewingNote(null)}
              className="absolute right-2 top-2 rounded-lg p-1 text-slate-600 hover:bg-white/50"
              aria-label="Cerrar vista"
            >
              <X size={16} />
            </button>

            {canEdit ? (
              <input
                type="text"
                value={viewingTitle}
                onChange={(event) => setViewingTitle(event.target.value)}
                className="w-full bg-transparent pr-8 text-base font-black text-slate-900 outline-none"
                placeholder="Titulo"
              />
            ) : (
              <p className="pr-8 text-base font-black text-slate-900">{viewingNote.title || "Nota sin titulo"}</p>
            )}
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              {new Date(viewingNote.updatedAt).toLocaleString()}
            </p>

            <div className="mt-3 pr-1">
              {canEdit ? (
                <textarea
                  ref={contentTextareaRef}
                  value={viewingContent}
                  onChange={(event) => setViewingContent(event.target.value)}
                  className="w-full resize-none overflow-y-auto whitespace-pre-wrap bg-transparent text-sm leading-relaxed text-slate-800 outline-none"
                  style={{ maxHeight: "90vh" }}
                  placeholder="Contenido"
                />
              ) : (
                <p className="whitespace-pre-wrap break-all text-sm leading-relaxed text-slate-800">{viewingNote.content || "(Sin contenido)"}</p>
              )}
            </div>


          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortableProjectNoteCard({
  note,
  isSorting,
  canEdit,
  deleting,
  onOpen,
  onEdit,
  onDelete,
}: {
  note: QuickNoteItem;
  isSorting: boolean;
  canEdit: boolean;
  deleting: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: !canEdit,
  });
  const cardRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [dragDimensions, setDragDimensions] = useState<{ width: number; height: number } | null>(null);
  const [rowSpan, setRowSpan] = useState(18);

  useEffect(() => {
    if (isSorting) {
      return;
    }

    const node = contentRef.current;
    if (!node) {
      return;
    }

    const rowHeight = 8;
    const rowGap = 12;

    const updateSpan = () => {
      const height = node.getBoundingClientRect().height;
      const nextSpan = Math.max(6, Math.ceil((height + rowGap) / (rowHeight + rowGap)));
      setRowSpan(nextSpan);
    };

    updateSpan();

    const observer = new ResizeObserver(() => {
      updateSpan();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [note.title, note.content, note.project?.name, canEdit, deleting, isSorting]);

  useEffect(() => {
    if (!isDragging) {
      setDragDimensions(null);
      return;
    }

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setDragDimensions({ width: rect.width, height: rect.height });
  }, [isDragging]);

  const bindNodeRef = (node: HTMLElement | null) => {
    cardRef.current = node;
    setNodeRef(node);
  };

  const previewText = (() => {
    const normalized = (note.content || "(Sin contenido)").replace(/\s+/g, " ").trim();
    if (normalized.length <= 1200) {
      return normalized;
    }

    return `${normalized.slice(0, 1197)}...`;
  })();

  return (
    <article
      ref={bindNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        backgroundColor: note.color,
        zIndex: isDragging ? 20 : 1,
        width: isDragging && dragDimensions ? `${dragDimensions.width}px` : undefined,
        height: isDragging && dragDimensions ? `${dragDimensions.height}px` : undefined,
        gridRowEnd: `span ${rowSpan}`,
      }}
      className={`group relative min-h-[120px] select-none overflow-hidden rounded-2xl border border-black/10 p-3 shadow-[0_6px_14px_rgba(15,23,42,0.1)] ${
        canEdit ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-90 shadow-xl" : ""}`}
      onClick={() => {
        if (!isDragging) {
          onOpen();
        }
      }}
      {...attributes}
      {...listeners}
    >
      <div ref={contentRef} className="flex min-h-[96px] flex-col pb-10">
        <div className="mb-2 flex items-start justify-between gap-2 min-w-0">
          <h3 className="min-w-0 flex-1 text-sm font-bold text-slate-900 [overflow-wrap:anywhere] break-all">{note.title || "Nota sin titulo"}</h3>
          <span className="shrink-0 text-[10px] font-semibold text-slate-600">{new Date(note.updatedAt).toLocaleDateString()}</span>
        </div>

        <p className="min-w-0 break-all text-xs leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{previewText}</p>

        {canEdit ? (
          <div className="absolute bottom-3 right-3 flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-white/75 px-2 py-1 text-[11px] font-semibold text-slate-700"
          >
            <Pencil size={12} /> Editar
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
            className="inline-flex items-center gap-1 rounded-lg bg-red-500/85 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-70"
          >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Eliminar
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
