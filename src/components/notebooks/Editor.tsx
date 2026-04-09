"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Content, JSONContent } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code, Italic, List, ListOrdered, Minus, Quote, Strikethrough, CloudCheck, CloudUpload, Loader2, Share2 } from "lucide-react";
import ShareAccessModal from "@/src/components/notebooks/ShareAccessModal";

interface NotebookDocument {
  id: string;
  title: string;
  content: JSONContent | null;
  currentUserRole?: "OWNER" | "EDITOR" | "READER" | null;
  isSharedWithMe?: boolean;
}

interface EditorProps {
  documentId: string;
}

export default function Editor({ documentId }: EditorProps) {
  const [document, setDocument] = useState<NotebookDocument | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const isReader = document?.currentUserRole === "READER";

  const saveChanges = useCallback(async (updatedTitle: string, updatedContent: JSONContent | null) => {
    if (isReader) {
      return;
    }

    setIsSaving(true);
    try {
      await fetch(`/api/notebooks/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updatedTitle,
          content: updatedContent,
        }),
      });
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setIsSaving(false);
    }
  }, [documentId, isReader]);

  useEffect(() => {
    let cancelled = false;

    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/notebooks/documents/${documentId}`);
        if (!response.ok) {
          throw new Error("No se pudo cargar el documento");
        }

        const data = (await response.json()) as NotebookDocument;
        if (cancelled) {
          return;
        }

        setDocument(data);
        setTitle(data.title);
      } catch {
        if (!cancelled) {
          setDocument(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDocument();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    if (!document || loading) {
      return;
    }

    const timeout = setTimeout(() => {
      if (title !== document.title) {
        saveChanges(title, document.content);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [title, document, loading, saveChanges]);

  const content = useMemo<Content>(() => document?.content ?? { type: "doc", content: [{ type: "paragraph" }] }, [document?.content]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-orion-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center text-white">
        No se encontro el documento.
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col bg-slate-900">
      <header className="flex items-center justify-between px-6 py-4 border-b border-orion-border dark:border-orion-dark-border gap-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="text-xl font-bold bg-transparent outline-none w-full text-white disabled:opacity-70"
          placeholder="Sin titulo"
          disabled={isReader}
        />

        <div className="flex items-center gap-2 text-sm text-slate-200">
          {!isReader ? (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="h-9 px-3 rounded-lg border border-orion-border dark:border-orion-dark-border text-white hover:bg-slate-800 inline-flex items-center gap-2"
            >
              <Share2 size={14} /> Compartir
            </button>
          ) : null}
          {isReader ? <span className="text-xs text-amber-300">Solo lectura</span> : null}
          {isSaving ? (
            <>
              <CloudUpload size={16} className="animate-pulse" /> Guardando...
            </>
          ) : (
            <>
              <CloudCheck size={16} className="text-green-500" /> Guardado
            </>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <RichTextEditor
            initialContent={content}
            onChange={(newContent) => saveChanges(title, newContent)}
            readOnly={Boolean(isReader)}
          />
        </div>
      </main>
      </div>
      <ShareAccessModal
        open={shareOpen}
        targetId={document.id}
        targetType="document"
        onClose={() => setShareOpen(false)}
      />
    </>
  );
}


interface RichTextEditorProps {
  initialContent: Content;
  onChange: (content: JSONContent) => void;
  readOnly?: boolean;
}

function RichTextEditor({ initialContent, onChange, readOnly = false }: RichTextEditorProps) {
  const normalizedContent = useMemo<Content>(() => {
    if (!initialContent || typeof initialContent !== "object") {
      return { type: "doc", content: [{ type: "paragraph" }] };
    }
    return initialContent;
  }, [initialContent]);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: normalizedContent,
    immediatelyRender: false,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[520px] text-lg px-2",
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(normalizedContent);
    if (current !== incoming) {
      editor.commands.setContent(normalizedContent);
    }
  }, [editor, normalizedContent]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const hasHeading = editor.isActive("heading");
    const isEmpty = editor.isEmpty;
    if (!hasHeading && isEmpty) {
      editor.chain().focus().setHeading({ level: 1 }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  const blockValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "paragraph";

  return (
    <div className="w-full space-y-3">
      {!readOnly && (
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-orion-border dark:border-orion-dark-border bg-slate-900 p-2 sticky top-0 z-10">
        <select
          value={blockValue}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "paragraph") {
              editor.chain().focus().setParagraph().run();
              return;
            }

            const level = Number(value.slice(1)) as 1 | 2 | 3;
            editor.chain().focus().setHeading({ level }).run();
          }}
          className="h-8 rounded-md border border-orion-border dark:border-orion-dark-border bg-slate-800 px-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
        >
          <option value="paragraph">Cuerpo</option>
          <option value="h1">Titulo 1</option>
          <option value="h2">Titulo 2</option>
          <option value="h3">Titulo 3</option>
        </select>

        <ToolbarButton label="Negrita" isActive={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={<Bold size={14} />} />
        <ToolbarButton label="Cursiva" isActive={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<Italic size={14} />} />
        <ToolbarButton label="Tachado" isActive={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} icon={<Strikethrough size={14} />} />
        <ToolbarButton label="Lista" isActive={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<List size={14} />} />
        <ToolbarButton label="Lista numerada" isActive={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={<ListOrdered size={14} />} />
        <ToolbarButton label="Cita" isActive={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} icon={<Quote size={14} />} />
        <ToolbarButton label="Codigo" isActive={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon={<Code size={14} />} />
        <ToolbarButton label="Separador" isActive={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={<Minus size={14} />} />
      </div>
      )}

      <div className="rounded-2xl border border-orion-border dark:border-orion-dark-border bg-slate-900 p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function ToolbarButton({ label, isActive, onClick, icon }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-2 rounded-md text-sm inline-flex items-center gap-1 border transition-colors ${
        isActive
          ? "border-orion-primary bg-orion-primary/10 text-orion-primary"
          : "border-transparent text-white hover:bg-slate-800"
      }`}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
