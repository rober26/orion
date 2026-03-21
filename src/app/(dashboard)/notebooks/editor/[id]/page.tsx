"use client";
import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Editor from "@/src/components/notebooks/Editor";
import { Loader2, ChevronLeft, CloudCheck, CloudUpload } from "lucide-react";

export default function DocumentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [document, setDocument] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const saveChanges = async (updatedTitle: string, updatedContent: any) => {
    setIsSaving(true);
    try {
      await fetch(`/api/notebooks/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updatedTitle,
          content: updatedContent,
        }),
      });
      console.log("Guardado");
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (loading || !document) return;
    
    const timeout = setTimeout(() => {
      if (title !== document.title) {
        saveChanges(title, document.content);
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [title]);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/notebooks/documents/${id}`);
        if (!response.ok) throw new Error("Error al cargar");
        const data = await response.json();
        setDocument(data);
        setTitle(data.title);
      } catch (error) {
        setDocument(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDocument();
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!document) return <div>Nota no encontrada</div>;

  return (
    <div className="flex flex-col h-full bg-orion-surface dark:bg-slate-900">
      <header className="flex items-center justify-between px-6 py-4 border-b border-orion-border dark:border-orion-dark-border">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={() => router.back()}><ChevronLeft size={20} /></button>
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold bg-transparent outline-none w-full"
          />
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {isSaving ? (
            <> <CloudUpload size={16} className="animate-pulse" /> Guardando... </>
          ) : (
            <> <CloudCheck size={16} className="text-green-500" /> Guardado </>
          )}
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <Editor 
            initialContent={document.content} 
            documentId={id} 
            onChange={(newContent) => {
              saveChanges(title, newContent);
            }}
          />
        </div>
      </main>
    </div>
  );
}
