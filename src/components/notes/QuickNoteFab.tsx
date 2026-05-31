"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import QuickNoteModal, { type QuickNoteDraft } from "@/src/components/notes/QuickNoteModal";

export default function QuickNoteFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (draft: QuickNoteDraft) => {
    if (!draft.title && !draft.content) {
      setError("Escribe una nota para guardar.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          content: draft.content,
          color: draft.color,
          projectId: draft.projectId,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo crear la nota");
      }

      window.dispatchEvent(new Event("quick-note:changed"));
      setIsOpen(false);
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
          if (!isSubmitting) {
            setError(null);
            setIsOpen((current) => !current);
          }
        }}
        disabled={isSubmitting}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-orion-primary text-white shadow-lg shadow-blue-500/30 transition-transform hover:scale-105 active:scale-95"
        aria-label="Crear nota rapida"
        aria-expanded={isOpen}
      >
        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
      </button>

      <QuickNoteModal
        open={isOpen}
        title="Nueva nota rapida"
        presentation="popover"
        showHeaderClose={false}
        submitting={isSubmitting}
        error={error}
        onClose={() => {
          if (!isSubmitting) {
            setIsOpen(false);
            setError(null);
          }
        }}
        onSave={(draft) => {
          void handleSave(draft);
        }}
      />
    </div>
  );
}
