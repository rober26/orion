"use client";

import { Check, Loader2, Plus, Search, StickyNote, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type NoteColor = "#fef3c7" | "#bfdbfe" | "#bbf7d0" | "#fecaca" | "#ddd6fe" | "#fed7aa";

type ProjectDocumentOption = {
  id: string;
  title: string;
  projectId: string;
  project: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
};

const NOTE_COLORS: NoteColor[] = ["#fef3c7", "#bfdbfe", "#bbf7d0", "#fecaca", "#ddd6fe", "#fed7aa"];

function parseKeepNote(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { title: "", content: "" };
  }

  const [firstLine, ...rest] = normalized.split("\n");
  const title = firstLine.trim().slice(0, 120);
  const content = rest.join("\n").trim().slice(0, 10000);

  return { title, content };
}

export default function QuickNoteFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [color, setColor] = useState<NoteColor>("#fef3c7");

  const [documents, setDocuments] = useState<ProjectDocumentOption[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);

  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const loadProjectDocuments = useCallback(async () => {
    try {
      setDocumentsLoading(true);
      const response = await fetch("/api/notebooks/documents?projectOnly=true", { cache: "no-store" });
      const payload =
        (await response.json()) as
          | Array<{
              id: string;
              title: string;
              projectId: string | null;
              project: { id: string; name: string; color?: string | null } | null;
            }>
          | { error?: string };

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "No se pudieron cargar documentos");
      }

      const parsed = Array.isArray(payload)
        ? payload
            .filter((item) => item.projectId && item.project)
            .map((item) => ({
              id: item.id,
              title: item.title || "Documento sin titulo",
              projectId: item.projectId as string,
              project: item.project,
            }))
        : [];

      setDocuments(parsed);
    } catch {
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadProjectDocuments();

    const onWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setShowDocumentPicker(false);
        setIsOpen(false);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      if (target.closest("[data-quick-note-fab='true']")) {
        return;
      }

      setShowDocumentPicker(false);
      if (!isSubmitting) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen, isSubmitting, loadProjectDocuments]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    requestAnimationFrame(() => {
      noteRef.current?.focus();
    });
  }, [isOpen]);

  const selectedDocument = useMemo(
    () => documents.find((item) => item.id === selectedDocumentId) || null,
    [documents, selectedDocumentId],
  );

  const filteredDocuments = useMemo(() => {
    const term = documentSearch.trim().toLowerCase();
    if (!term) {
      return documents.slice(0, 12);
    }

    return documents
      .filter((item) => {
        const doc = item.title.toLowerCase();
        const project = item.project?.name.toLowerCase() || "";
        return doc.includes(term) || project.includes(term);
      })
      .slice(0, 18);
  }, [documentSearch, documents]);

  const parsed = useMemo(() => parseKeepNote(noteText), [noteText]);

  const resetForm = () => {
    setNoteText("");
    setColor("#fef3c7");
    setDocumentSearch("");
    setSelectedDocumentId("");
    setShowDocumentPicker(false);
    setError(null);
  };

  const closePopover = () => {
    if (isSubmitting) {
      return;
    }
    setIsOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!parsed.title && !parsed.content) {
      setError("Escribe una nota para guardar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.title,
          content: parsed.content,
          color,
          sourceDocumentId: selectedDocumentId || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo crear la nota");
      }

      setIsOpen(false);
      resetForm();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "No se pudo crear la nota";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-quick-note-fab="true" className="fixed bottom-4 right-4 z-[70]">
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            closePopover();
            return;
          }
          setIsOpen(true);
        }}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-orion-primary text-white shadow-lg shadow-blue-500/30 transition-transform hover:scale-105 active:scale-95"
        aria-label="Crear nota rapida"
      >
        {isOpen ? <X size={20} /> : <Plus size={20} />}
      </button>

      <div
        ref={popoverRef}
        className={`absolute bottom-14 right-0 w-[min(92vw,26rem)] origin-bottom-right overflow-hidden rounded-3xl border border-orion-border bg-white shadow-2xl transition-all duration-250 dark:border-orion-dark-border dark:bg-slate-900 ${
          isOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-[0.97] opacity-0"
        }`}
      >
        <div className="border-b border-orion-border px-4 py-3 dark:border-orion-dark-border">
          <div className="flex items-center gap-2">
            <StickyNote size={15} className="text-orion-primary" />
            <p className="truncate text-sm font-black tracking-tight text-slate-800 dark:text-slate-100">
              {parsed.title || "Nueva nota"}
            </p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <textarea
            ref={noteRef}
            value={noteText}
            onChange={(event) => setNoteText(event.target.value.slice(0, 10120))}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void handleSave();
              }
            }}
            placeholder="Toma una nota..."
            className="min-h-28 w-full resize-none rounded-2xl border border-black/10 px-3 py-2 text-sm leading-relaxed text-slate-800 outline-none transition-colors focus:ring-2 focus:ring-orion-primary/30"
            style={{ backgroundColor: color }}
          />

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowDocumentPicker((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl border border-orion-border bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-orion-dark-border dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span className="truncate">
                {selectedDocument
                  ? `${selectedDocument.project?.name || "Proyecto"} / ${selectedDocument.title}`
                  : "Relacionar a proyecto desde documento"}
              </span>
              <span className="text-xs text-slate-400">{showDocumentPicker ? "Ocultar" : "Elegir"}</span>
            </button>

            {showDocumentPicker ? (
              <div className="rounded-xl border border-orion-border p-2 dark:border-orion-dark-border">
                <label className="relative block">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={documentSearch}
                    onChange={(event) => setDocumentSearch(event.target.value)}
                    placeholder="Buscar por documento o proyecto"
                    className="input-orion h-9 pl-8 text-sm"
                  />
                </label>

                <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedDocumentId("")}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-semibold transition-colors ${
                      selectedDocumentId === ""
                        ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>Sin relacion de proyecto</span>
                    {selectedDocumentId === "" ? <Check size={14} /> : null}
                  </button>

                  {documentsLoading ? (
                    <div className="flex items-center gap-2 px-2 py-3 text-sm text-slate-500">
                      <Loader2 size={14} className="animate-spin" /> Cargando documentos...
                    </div>
                  ) : filteredDocuments.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-slate-500">No hay documentos de proyecto disponibles.</p>
                  ) : (
                    filteredDocuments.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedDocumentId(item.id)}
                        className={`w-full rounded-lg px-2 py-2 text-left transition-colors ${
                          selectedDocumentId === item.id
                            ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{item.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.project?.color || "#3b82f6" }}
                          />
                          {item.project?.name || "Proyecto"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {NOTE_COLORS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setColor(item)}
                className={`h-7 w-7 rounded-lg border transition-transform hover:scale-105 ${
                  color === item ? "border-slate-900 dark:border-white" : "border-black/10"
                }`}
                style={{ backgroundColor: item }}
                aria-label={`Color ${item}`}
              />
            ))}
          </div>

          {error ? (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-orion-border px-4 py-3 dark:border-orion-dark-border">
          <button type="button" onClick={closePopover} className="btn-secondary text-sm" disabled={isSubmitting}>
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSubmitting}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Guardando...
              </span>
            ) : (
              "Guardar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
