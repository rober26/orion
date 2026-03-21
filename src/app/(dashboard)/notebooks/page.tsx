"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileExplorer from "@/src/components/notebooks/FileExplorer";
import { BookOpen, Sparkles, Plus, Loader2 } from "lucide-react";

export default function NotebooksPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNote = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const userRes = await fetch("/api/users/me");
      
      if (!userRes.ok) {
        throw new Error("No se pudo verificar la sesión. Por favor, reintenta.");
      }
      
      const userData = await userRes.json();

      if (!userData?.id) {
        throw new Error("ID de usuario no encontrado en la respuesta.");
      }

      const response = await fetch("/api/notebooks/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Nueva nota sin título",
          creatorId: userData.id, 
          notebookId: null,      
          projectId: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Fallo al crear la nota en el servidor.");
      }

      router.refresh(); 
      router.push(`/notebooks/editor/${result.id}`);

    } catch (error: any) {
      console.error("Error al crear nota:", error);
      alert(error.message || "Ocurrio un error inesperado.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-160px)] surface-panel rounded-[2.5rem] overflow-hidden">
      <FileExplorer />
      
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/30 dark:bg-transparent">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-orion-primary/10 dark:bg-orion-primary/20 rounded-[2rem] flex items-center justify-center text-orion-primary transition-all hover:scale-110 duration-500">
            {isCreating ? (
              <Loader2 className="animate-spin" size={48} />
            ) : (
              <BookOpen size={48} />
            )}
          </div>
          {isCreating && (
            <div className="absolute -bottom-2 -right-2 bg-orion-surface dark:bg-slate-900 p-2 rounded-full shadow-xl border border-orion-border dark:border-orion-dark-border">
              <Loader2 className="animate-spin text-orion-primary" size={20} />
            </div>
          )}
        </div>

        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          Tu Cerebro Digital
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-10 leading-relaxed text-lg">
          Organiza tus ideas de forma jerárquica. Crea una nota para empezar a construir tu red de conocimiento.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <QuickAction 
            icon={<Plus size={22} />} 
            label={isCreating ? "Sincronizando..." : "Nueva Nota"} 
            onClick={handleCreateNote}
            disabled={isCreating}
            primary
          />
          <QuickAction 
            icon={<Sparkles size={22} />} 
            label="Visualizar Grafo" 
            onClick={() => router.push('/notebooks/graph')}
            disabled={isCreating}
          />
        </div>
      </div>
    </div>
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
