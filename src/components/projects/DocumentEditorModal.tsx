"use client";

import Editor from "@/src/components/notebooks/Editor";
import { X } from "lucide-react";

interface DocumentEditorModalProps {
  documentId: string | null;
  title?: string;
  onClose: () => void;
}

export default function DocumentEditorModal({ documentId, title, onClose }: DocumentEditorModalProps) {
  if (!documentId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="surface-panel flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl">
        <header className="flex items-center justify-between border-b border-orion-border px-4 py-3 dark:border-orion-dark-border">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Editor de documento</h2>
            <p className="text-sm text-slate-500">{title || "Sin título"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn min-h-10 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
            aria-label="Cerrar editor"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1">
          <Editor key={documentId} documentId={documentId} />
        </div>
      </div>
    </div>
  );
}
