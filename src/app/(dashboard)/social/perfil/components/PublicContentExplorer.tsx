import { BookOpen, FileText, Folder } from "lucide-react";

type ExplorerFolder = {
  id: string;
  name: string;
};

type ExplorerNotebook = {
  id: string;
  title: string;
  folderId?: string | null;
};

type ExplorerDocument = {
  id: string;
  title: string;
  notebookId?: string | null;
  updatedAt?: string;
};

interface PublicContentExplorerProps {
  folders: ExplorerFolder[];
  notebooks: ExplorerNotebook[];
  documents: ExplorerDocument[];
  title?: string;
}

function formatDate(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function PublicContentExplorer({
  folders,
  notebooks,
  documents,
  title = "Documentacion publica",
}: PublicContentExplorerProps) {
  const notebooksByFolder = new Map<string, ExplorerNotebook[]>();
  for (const notebook of notebooks) {
    if (!notebook.folderId) {
      continue;
    }
    const list = notebooksByFolder.get(notebook.folderId) || [];
    list.push(notebook);
    notebooksByFolder.set(notebook.folderId, list);
  }

  const documentsByNotebook = new Map<string, ExplorerDocument[]>();
  for (const document of documents) {
    if (!document.notebookId) {
      continue;
    }
    const list = documentsByNotebook.get(document.notebookId) || [];
    list.push(document);
    documentsByNotebook.set(document.notebookId, list);
  }

  const ungroupedNotebooks = notebooks.filter((notebook) => !notebook.folderId);
  const standaloneDocuments = documents.filter((document) => !document.notebookId);
  const hasContent = folders.length > 0 || notebooks.length > 0 || documents.length > 0;

  return (
    <article className="surface-soft p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
        <Folder size={16} /> {title}
      </h3>

      {!hasContent ? (
        <p className="text-sm text-slate-500">No hay contenido publico para mostrar.</p>
      ) : (
        <div className="space-y-3">
          {folders.map((folder) => (
            <div key={folder.id} className="rounded-xl border border-orion-border bg-white p-2 dark:border-orion-dark-border dark:bg-slate-900">
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                <Folder size={14} className="text-amber-400" />
                <span className="truncate">{folder.name || "Sin titulo"}</span>
              </div>

              <div className="mt-1 space-y-1 pl-4">
                {(notebooksByFolder.get(folder.id) || []).map((notebook) => (
                  <div key={notebook.id} className="space-y-1">
                    <div className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700 dark:text-slate-200">
                      <BookOpen size={13} className="text-blue-400" />
                      <span className="truncate">{notebook.title || "Sin titulo"}</span>
                    </div>
                    <div className="space-y-1 pl-4">
                      {(documentsByNotebook.get(notebook.id) || []).map((document) => (
                        <a
                          key={document.id}
                          href={`/notebooks?doc=${document.id}`}
                          className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <FileText size={12} className="text-slate-400" />
                          <span className="truncate flex-1">{document.title || "Sin titulo"}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(document.updatedAt)}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {ungroupedNotebooks.map((notebook) => (
            <div key={notebook.id} className="rounded-xl border border-orion-border bg-white p-2 dark:border-orion-dark-border dark:bg-slate-900">
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200">
                <BookOpen size={13} className="text-blue-400" />
                <span className="truncate">{notebook.title || "Sin titulo"}</span>
              </div>
              <div className="space-y-1 pl-4 mt-1">
                {(documentsByNotebook.get(notebook.id) || []).map((document) => (
                  <a
                    key={document.id}
                    href={`/notebooks?doc=${document.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <FileText size={12} className="text-slate-400" />
                    <span className="truncate flex-1">{document.title || "Sin titulo"}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(document.updatedAt)}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}

          {standaloneDocuments.map((document) => (
            <a
              key={document.id}
              href={`/notebooks?doc=${document.id}`}
              className="flex items-center gap-2 rounded-xl border border-orion-border bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 dark:border-orion-dark-border dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FileText size={12} className="text-slate-400" />
              <span className="truncate flex-1">{document.title || "Sin titulo"}</span>
              <span className="text-[10px] text-slate-400">{formatDate(document.updatedAt)}</span>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
