"use client";

import { Check, Loader2, Search, StickyNote, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type NoteColor = "#fef3c7" | "#bfdbfe" | "#bbf7d0" | "#fecaca" | "#ddd6fe" | "#fed7aa";

type ProjectOption = {
  id: string;
  name: string;
  color?: string | null;
};

export type QuickNoteDraft = {
  title: string;
  content: string;
  color: NoteColor;
  projectId: string | null;
};

type QuickNoteModalProps = {
  open: boolean;
  title: string;
  presentation?: "modal" | "popover";
  showHeaderClose?: boolean;
  initialValue?: {
    title?: string;
    content?: string;
    color?: string;
    projectId?: string | null;
  };
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (draft: QuickNoteDraft) => void;
};

const NOTE_COLORS: NoteColor[] = ["#fef3c7", "#bfdbfe", "#bbf7d0", "#fecaca", "#ddd6fe", "#fed7aa"];

function parseKeepNote(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { title: "", content: "" };
  }

  const [firstLine, ...rest] = normalized.split("\n");
  const parsedTitle = firstLine.trim().slice(0, 120);
  const parsedContent = rest.join("\n").trim().slice(0, 10000);

  return { title: parsedTitle, content: parsedContent };
}

function safeColor(value: string | undefined): NoteColor {
  if (value && NOTE_COLORS.includes(value as NoteColor)) {
    return value as NoteColor;
  }

  return "#fef3c7";
}

export default function QuickNoteModal({
  open,
  title,
  presentation = "modal",
  showHeaderClose = true,
  initialValue,
  submitting = false,
  error = null,
  onClose,
  onSave,
}: QuickNoteModalProps) {
  const [noteText, setNoteText] = useState("");
  const [color, setColor] = useState<NoteColor>("#fef3c7");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextTitle = initialValue?.title?.trim() || "";
    const nextContent = initialValue?.content?.trim() || "";
    setNoteText(nextTitle && nextContent ? `${nextTitle}\n${nextContent}` : `${nextTitle}${nextContent ? `\n${nextContent}` : ""}`);
    setColor(safeColor(initialValue?.color));
    setSelectedProjectId(initialValue?.projectId || "");
    setProjectSearch("");
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setProjectsLoading(true);
    fetch("/api/projects?status=active", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as Array<{ id: string; name: string; color?: string | null }>;
        if (!response.ok || !Array.isArray(payload)) {
          setProjects([]);
          return;
        }

        setProjects(
          payload
            .filter((item) => typeof item.id === "string" && typeof item.name === "string")
            .map((item) => ({
              id: item.id,
              name: item.name,
              color: item.color,
            })),
        );
      })
      .catch(() => {
        setProjects([]);
      })
      .finally(() => {
        setProjectsLoading(false);
      });
  }, [open]);

  const parsed = useMemo(() => parseKeepNote(noteText), [noteText]);

  const filteredProjects = useMemo(() => {
    const term = projectSearch.trim().toLowerCase();
    if (!term) {
      return projects.slice(0, 20);
    }

    return projects.filter((item) => item.name.toLowerCase().includes(term)).slice(0, 20);
  }, [projectSearch, projects]);

  if (!open) {
    return null;
  }

  const isPopover = presentation === "popover";

  const panel = (
    <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-orion-border bg-white shadow-2xl dark:border-orion-dark-border dark:bg-slate-900">
      <div className="border-b border-orion-border px-4 py-3 dark:border-orion-dark-border">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 min-w-0">
            <StickyNote size={15} className="text-orion-primary" />
            <p className="truncate text-sm font-black tracking-tight text-slate-800 dark:text-slate-100">{title}</p>
          </div>
          {showHeaderClose ? (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <textarea
          value={noteText}
          onChange={(event) => setNoteText(event.target.value.slice(0, 10120))}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              onSave({
                title: parsed.title,
                content: parsed.content,
                color,
                projectId: selectedProjectId || null,
              });
            }
          }}
          placeholder="Toma una nota..."
          className={`${isPopover ? "min-h-44" : "min-h-64"} w-full resize-none rounded-2xl border border-black/10 px-3 py-3 text-sm leading-relaxed text-slate-800 outline-none transition-colors focus:ring-2 focus:ring-orion-primary/30`}
          style={{ backgroundColor: color }}
        />

        <div className="rounded-xl border border-orion-border p-2 dark:border-orion-dark-border">
          <label className="relative block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={projectSearch}
              onChange={(event) => setProjectSearch(event.target.value)}
              placeholder="Relacionar a proyecto"
              className="input-orion h-9 pl-8 text-sm"
            />
          </label>

          <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedProjectId("")}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-semibold transition-colors ${
                selectedProjectId === ""
                  ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span>Sin relacion de proyecto</span>
              {selectedProjectId === "" ? <Check size={14} /> : null}
            </button>

            {projectsLoading ? (
              <div className="flex items-center gap-2 px-2 py-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Cargando proyectos...
              </div>
            ) : filteredProjects.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-500">No hay proyectos disponibles.</p>
            ) : (
              filteredProjects.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedProjectId(item.id)}
                  className={`w-full rounded-lg px-2 py-2 text-left transition-colors ${
                    selectedProjectId === item.id
                      ? "bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/20 dark:text-blue-100"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-200">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || "#3b82f6" }} />
                    {item.name}
                  </p>
                </button>
              ))
            )}
          </div>
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
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</div>
        ) : null}
      </div>

      <div className={`flex items-center gap-2 border-t border-orion-border px-4 py-3 dark:border-orion-dark-border ${isPopover ? "justify-end" : "justify-between"}`}>
        {!isPopover ? (
          <button type="button" onClick={onClose} className="btn-secondary text-sm" disabled={submitting}>
            Cerrar
          </button>
        ) : null}
        <button
          type="button"
          onClick={() =>
            onSave({
              title: parsed.title,
              content: parsed.content,
              color,
              projectId: selectedProjectId || null,
            })
          }
          disabled={submitting}
          className="btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Guardando...
            </span>
          ) : (
            "Guardar"
          )}
        </button>
      </div>
    </div>
  );

  if (isPopover) {
    return <div className="absolute bottom-14 right-0 z-[80] w-[min(92vw,26rem)]">{panel}</div>;
  }

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">{panel}</div>;
}
