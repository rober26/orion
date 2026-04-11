"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Book,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Notebook,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import ShareAccessModal from "@/src/components/notebooks/ShareAccessModal";

interface ExplorerDocument {
  id: string;
  title: string;
  notebookId: string | null;
  position: number;
  isSharedWithMe?: boolean;
  currentUserRole?: "OWNER" | "EDITOR" | "READER" | null;
}

interface ExplorerNotebook {
  id: string;
  title: string;
  color: string | null;
  folderId: string | null;
  documents: ExplorerDocument[];
  isSharedWithMe?: boolean;
  currentUserRole?: "OWNER" | "EDITOR" | "READER" | null;
}

interface SharedOwner {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

interface SharedWithMeNotebook {
  id: string;
  title: string;
  color: string | null;
  permission: "OWNER" | "EDITOR" | "READER";
  sharedAt: string;
  owner: SharedOwner;
}

interface SharedWithMeDocument {
  id: string;
  title: string;
  notebookId: string | null;
  permission: "OWNER" | "EDITOR" | "READER";
  sharedAt: string;
  owner: SharedOwner;
}

interface SharedWithMeData {
  notebooks: SharedWithMeNotebook[];
  documents: SharedWithMeDocument[];
}

interface ExplorerFolder {
  id: string;
  name: string;
  notebooks: ExplorerNotebook[];
}

interface ExplorerState {
  folders: ExplorerFolder[];
  ungroupedNotebooks: ExplorerNotebook[];
  standaloneDocs: ExplorerDocument[];
  sharedWithMeNotebooks: SharedWithMeNotebook[];
  sharedWithMeDocs: SharedWithMeDocument[];
}

type DraftType = "folder" | "notebook" | "document";

interface RenameState {
  id: string;
  type: DraftType;
  value: string;
}

interface DraftCreateState {
  id: string;
  type: DraftType;
  parentId: string | null;
  value: string;
}

interface FileExplorerProps {
  collapsible?: boolean;
}

export default function FileExplorer({ collapsible = false }: FileExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDocId = searchParams.get("doc");
  const activeFolderFromRoute = searchParams.get("folder");

  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [state, setState] = useState<ExplorerState>({
    folders: [],
    ungroupedNotebooks: [],
    standaloneDocs: [],
    sharedWithMeNotebooks: [],
    sharedWithMeDocs: [],
  });
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [expandedNotebooks, setExpandedNotebooks] = useState<Record<string, boolean>>({});
  const [rename, setRename] = useState<RenameState | null>(null);
  const [createDraft, setCreateDraft] = useState<DraftCreateState | null>(null);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{ type: "folder" | "notebook" | "document"; id: string } | null>(null);
  const [openMenu, setOpenMenu] = useState<{ type: "folder" | "notebook" | "document"; id: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeEditKey = rename
    ? `${rename.type}:${rename.id}`
    : createDraft
      ? `draft:${createDraft.type}:${createDraft.id}`
      : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));

  const activeNotebookFromRoute = searchParams.get("notebook");

  const fetchState = useCallback(async () => {
    const [foldersRes, notebooksRes, standaloneDocsRes, sharedWithMeRes] = await Promise.all([
      fetch("/api/notebooks/folders"),
      fetch("/api/notebooks"),
      fetch("/api/notebooks/documents?standalone=true"),
      fetch("/api/notebooks/shared-with-me"),
    ]);

    if (!foldersRes.ok || !notebooksRes.ok || !standaloneDocsRes.ok || !sharedWithMeRes.ok) {
      throw new Error("No se pudo cargar el explorador");
    }

    const folders = (await foldersRes.json()) as ExplorerFolder[];
    const notebooks = (await notebooksRes.json()) as ExplorerNotebook[];
    const standaloneDocs = (await standaloneDocsRes.json()) as ExplorerDocument[];
    const sharedWithMe = (await sharedWithMeRes.json()) as SharedWithMeData;

    return {
      folders,
      standaloneDocs,
      ungroupedNotebooks: notebooks.filter((notebook) => !notebook.folderId),
      sharedWithMeNotebooks: sharedWithMe.notebooks ?? [],
      sharedWithMeDocs: sharedWithMe.documents ?? [],
    } satisfies ExplorerState;
  }, []);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const next = await fetchState();
      setState(next);
    } catch (error) {
      console.error("Error cargando explorer:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchState]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!activeEditKey) {
      return;
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [activeEditKey]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-row-menu='true']")) {
        return;
      }
      setOpenMenu(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const findNotebook = useCallback(
    (id: string) => {
      for (const folder of state.folders) {
        const found = folder.notebooks.find((notebook) => notebook.id === id);
        if (found) {
          return found;
        }
      }
      return state.ungroupedNotebooks.find((notebook) => notebook.id === id) ?? null;
    },
    [state.folders, state.ungroupedNotebooks],
  );

  const startCreate = useCallback((type: DraftType, parentId: string | null) => {
    const id = `draft-${type}-${Date.now()}`;
    setCreateDraft({ id, type, parentId, value: "" });

    if (type === "folder") {
      setState((prev) => ({ ...prev, folders: [{ id, name: "", notebooks: [] }, ...prev.folders] }));
      setExpandedFolders((prev) => ({ ...prev, [id]: true }));
      return;
    }

    if (type === "notebook") {
      const draftNotebook: ExplorerNotebook = { id, title: "", color: "#3b82f6", folderId: parentId, documents: [] };
      if (!parentId) {
        setState((prev) => ({ ...prev, ungroupedNotebooks: [draftNotebook, ...prev.ungroupedNotebooks] }));
      } else {
        setState((prev) => ({
          ...prev,
          folders: prev.folders.map((folder) =>
            folder.id === parentId ? { ...folder, notebooks: [draftNotebook, ...folder.notebooks] } : folder,
          ),
        }));
        setExpandedFolders((prev) => ({ ...prev, [parentId]: true }));
      }
      return;
    }

    const draftDocument: ExplorerDocument = {
      id,
      title: "",
      notebookId: parentId,
      position: 0,
    };

    if (!parentId) {
      setState((prev) => ({ ...prev, standaloneDocs: [draftDocument, ...prev.standaloneDocs] }));
      return;
    }

    setState((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) => ({
        ...folder,
        notebooks: folder.notebooks.map((notebook) =>
          notebook.id === parentId ? { ...notebook, documents: [draftDocument, ...notebook.documents] } : notebook,
        ),
      })),
      ungroupedNotebooks: prev.ungroupedNotebooks.map((notebook) =>
        notebook.id === parentId ? { ...notebook, documents: [draftDocument, ...notebook.documents] } : notebook,
      ),
    }));
    setExpandedNotebooks((prev) => ({ ...prev, [parentId]: true }));
  }, []);

  const openNotebook = useCallback(
    (id: string) => {
      setExpandedNotebooks((prev) => ({ ...prev, [id]: true }));
      router.push(`/notebooks?notebook=${id}`);
    },
    [router],
  );

  const openDocument = useCallback(
    (id: string) => {
      router.push(`/notebooks?doc=${id}`);
    },
    [router],
  );

  const renameEntity = useCallback(
    async (renameState: RenameState) => {
      const value = renameState.value.trim();
      if (!value) {
        await reload();
        return;
      }

      if (renameState.type === "folder") {
        await fetch("/api/notebooks/folders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: renameState.id, name: value }),
        });
      }

      if (renameState.type === "notebook") {
        const notebook = findNotebook(renameState.id);
        if (notebook) {
          await fetch(`/api/notebooks/${renameState.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: value,
              description: "",
              color: notebook.color,
              icon: "Book",
              folderId: notebook.folderId,
              isPublic: false,
            }),
          });
        }
      }

      if (renameState.type === "document") {
        await fetch(`/api/notebooks/documents/${renameState.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: value }),
        });
      }

      await reload();
    },
    [findNotebook, reload],
  );

  const createEntity = useCallback(
    async (draft: DraftCreateState) => {
      const value = draft.value.trim();
      if (!value) {
        await reload();
        return;
      }

      if (draft.type === "folder") {
        const folderRes = await fetch("/api/notebooks/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: value }),
        });

        if (!folderRes.ok) {
          const payload = (await folderRes.json()) as { error?: string };
          throw new Error(payload.error || "No se pudo crear la carpeta");
        }

        await reload();
        return;
      }

      if (draft.type === "notebook") {
        await fetch("/api/notebooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: value,
            description: "",
            folderId: draft.parentId,
          }),
        });
        await reload();
        return;
      }

      const response = await fetch("/api/notebooks/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: value,
          notebookId: draft.parentId,
          projectId: null,
        }),
      });

      if (response.ok) {
        const created = (await response.json()) as { id: string };
        router.push(`/notebooks?doc=${created.id}`);
      }
      await reload();
    },
    [reload, router],
  );

  const commitInput = useCallback(async () => {
    if (rename) {
      const current = rename;
      setRename(null);
      try {
        await renameEntity(current);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo actualizar";
        alert(message);
        await reload();
      }
      return;
    }

    if (createDraft) {
      const current = createDraft;
      setCreateDraft(null);
      try {
        await createEntity(current);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo crear";
        alert(message);
        await reload();
      }
    }
  }, [createDraft, createEntity, reload, rename, renameEntity]);

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setDragLabel(null);
      if (!over || active.id === over.id) {
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId.startsWith("doc:") && overId.startsWith("doc:")) {
        const fromDoc = activeId.replace("doc:", "");
        const toDoc = overId.replace("doc:", "");

        const allNotebooks = [...state.ungroupedNotebooks, ...state.folders.flatMap((folder) => folder.notebooks)];
        const notebook = allNotebooks.find(
          (item) => item.documents.some((doc) => doc.id === fromDoc) && item.documents.some((doc) => doc.id === toDoc),
        );

        if (notebook) {
          const from = notebook.documents.findIndex((doc) => doc.id === fromDoc);
          const to = notebook.documents.findIndex((doc) => doc.id === toDoc);
          const reordered = arrayMove(notebook.documents, from, to);

          setState((prev) => ({
            ...prev,
            folders: prev.folders.map((folder) => ({
              ...folder,
              notebooks: folder.notebooks.map((item) => (item.id === notebook.id ? { ...item, documents: reordered } : item)),
            })),
            ungroupedNotebooks: prev.ungroupedNotebooks.map((item) =>
              item.id === notebook.id ? { ...item, documents: reordered } : item,
            ),
          }));

          await Promise.all(
            reordered.map((doc, index) =>
              fetch(`/api/notebooks/documents/${doc.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ position: index, notebookId: notebook.id }),
              }),
            ),
          );
          return;
        }
      }

      if (activeId.startsWith("doc:") && overId.startsWith("drop-notebook:")) {
        const docId = activeId.replace("doc:", "");
        const targetNotebookId = overId.replace("drop-notebook:", "") || null;

        await fetch(`/api/notebooks/documents/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notebookId: targetNotebookId, position: 0 }),
        });
        await reload();
        return;
      }

      if (activeId.startsWith("notebook:") && overId.startsWith("drop-folder:")) {
        const notebookId = activeId.replace("notebook:", "");
        const targetFolderId = overId.replace("drop-folder:", "") || null;
        const notebook = findNotebook(notebookId);

        if (!notebook) {
          return;
        }

        await fetch(`/api/notebooks/${notebookId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: notebook.title,
            description: "",
            color: notebook.color,
            icon: "Book",
            folderId: targetFolderId,
            isPublic: false,
          }),
        });
        await reload();
      }
    },
    [findNotebook, reload, state.folders, state.ungroupedNotebooks],
  );

  const deleteEntity = useCallback(
    async (type: "folder" | "notebook" | "document", id: string) => {
      const labels: Record<typeof type, string> = {
        folder: "esta carpeta",
        notebook: "este cuaderno",
        document: "este documento",
      };

      if (!window.confirm(`Seguro que quieres eliminar ${labels[type]}?`)) {
        return;
      }

      try {
        if (type === "folder") {
          const response = await fetch("/api/notebooks/folders", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });

          if (!response.ok) {
            const payload = (await response.json()) as { error?: string };
            throw new Error(payload.error || "No se pudo eliminar la carpeta");
          }
        }

        if (type === "notebook") {
          const response = await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
          if (!response.ok) {
            const payload = (await response.json()) as { error?: string };
            throw new Error(payload.error || "No se pudo eliminar el cuaderno");
          }
        }

        if (type === "document") {
          const response = await fetch(`/api/notebooks/documents/${id}`, { method: "DELETE" });
          if (!response.ok) {
            const payload = (await response.json()) as { error?: string };
            throw new Error(payload.error || "No se pudo eliminar el documento");
          }
        }

        router.push("/notebooks");
        await reload();
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo eliminar";
        alert(message);
      }
    },
    [reload, router],
  );

  if (loading) {
    return (
      <div className="w-80 border-r border-orion-border dark:border-orion-dark-border p-4 flex items-center gap-2 text-slate-200">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Sincronizando...</span>
      </div>
    );
  }

  if (collapsible && collapsed) {
    return (
      <div className="w-14 border-r border-orion-border dark:border-orion-dark-border h-full flex flex-col items-center py-3 bg-orion-surface-muted/60 dark:bg-transparent">
        <button type="button" onClick={() => setCollapsed(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60">
          <PanelLeftOpen size={18} className="text-slate-200" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-80 border-r border-orion-border dark:border-orion-dark-border h-full flex flex-col bg-slate-900">
        <div className="p-4 flex items-center justify-between border-b border-orion-border dark:border-orion-dark-border">
          <h2 className="font-bold text-white text-sm uppercase tracking-wider">Explorador</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => startCreate("folder", null)}
            className="p-1 rounded-md hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
          >
            <FolderPlus size={18} className="text-orion-primary" />
          </button>
          <button
            type="button"
            onClick={() => startCreate("notebook", activeFolderFromRoute)}
            className="p-1 rounded-md hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
          >
            <Notebook size={18} className="text-orion-primary" />
          </button>
          <button
            type="button"
            onClick={() => startCreate("document", activeNotebookFromRoute)}
            className="p-1 rounded-md hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
          >
            <Plus size={18} className="text-orion-primary" />
          </button>
          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-1 rounded-md hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
            >
              <PanelLeftClose size={18} className="text-slate-200" />
            </button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => {
          const id = String(event.active.id);
          setDragLabel(id.startsWith("doc:") ? "Documento" : id.startsWith("notebook:") ? "Cuaderno" : "Elemento");
        }}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          <DropZone id="drop-folder:" label="Soltar para dejar cuaderno fuera de carpeta" />

          <div className="space-y-1">
            <p className="px-2 pb-1 text-[10px] font-bold text-slate-200 uppercase">Carpetas</p>
            {state.folders.map((folder) => (
              <div key={folder.id} className="space-y-1">
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-800/80 text-white transition-colors"
                  onClick={() => {
                    setExpandedFolders((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }));
                    router.push(`/notebooks?folder=${folder.id}`);
                  }}
                  onDoubleClick={() => setRename({ id: folder.id, type: "folder", value: folder.name })}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpenMenu({ type: "folder", id: folder.id });
                  }}
                >
                  <button type="button" className="p-0.5">
                    {expandedFolders[folder.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <Folder size={16} className="text-amber-400" />
                  {rename?.id === folder.id && rename.type === "folder" ? (
                    <input
                      ref={inputRef}
                      value={rename.value}
                      onChange={(event) => setRename((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
                      onBlur={() => void commitInput()}
                      onKeyDown={(event) => event.key === "Enter" && void commitInput()}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      className="w-full bg-transparent text-sm outline-none text-white"
                    />
                  ) : createDraft?.id === folder.id ? (
                    <input
                      ref={inputRef}
                      value={createDraft.value}
                      onChange={(event) => setCreateDraft((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
                      onBlur={() => void commitInput()}
                      onKeyDown={(event) => event.key === "Enter" && void commitInput()}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      className="w-full bg-transparent text-sm outline-none text-white"
                      placeholder="Nombre de carpeta"
                    />
                  ) : (
                    <span className="truncate text-sm text-white">{folder.name || "Sin nombre"}</span>
                  )}
                  <div className="relative ml-auto" data-row-menu="true">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenu((prev) =>
                          prev?.type === "folder" && prev.id === folder.id ? null : { type: "folder", id: folder.id },
                        );
                      }}
                      className="p-1 rounded-md hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
                      aria-label="Opciones carpeta"
                      title="Opciones"
                    >
                      <MoreHorizontal size={13} />
                    </button>
                    {openMenu?.type === "folder" && openMenu.id === folder.id ? (
                      <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-orion-border dark:border-orion-dark-border bg-slate-900 shadow-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenu(null);
                            setRename({ id: folder.id, type: "folder", value: folder.name || "" });
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-800"
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenu(null);
                            startCreate("notebook", folder.id);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-800"
                        >
                          Anadir cuaderno
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenu(null);
                            setShareTarget({ type: "folder", id: folder.id });
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-800"
                        >
                          Compartir
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenu(null);
                            void deleteEntity("folder", folder.id);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10"
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <DropZone id={`drop-folder:${folder.id}`} label={`Soltar cuaderno en ${folder.name}`} />

                {expandedFolders[folder.id] && (
                  <div className="ml-4 pl-2 border-l border-orion-border dark:border-orion-dark-border space-y-1">
                    <SortableContext items={folder.notebooks.map((notebook) => `notebook:${notebook.id}`)} strategy={verticalListSortingStrategy}>
                      {folder.notebooks.map((notebook) => (
                        <NotebookRow
                          key={notebook.id}
                          notebook={notebook}
                          selectedDocId={selectedDocId}
                          rename={rename}
                          createDraft={createDraft}
                          inputRef={inputRef}
                          setRename={setRename}
                          setCreateDraft={setCreateDraft}
                          onCommit={commitInput}
                          onOpenNotebook={openNotebook}
                          onOpenDocument={openDocument}
                          onCreateDocument={() => startCreate("document", notebook.id)}
                          onRename={() => setRename({ id: notebook.id, type: "notebook", value: notebook.title || "" })}
                          onShare={() => setShareTarget({ type: "notebook", id: notebook.id })}
                          onShareDocument={(id) => setShareTarget({ type: "document", id })}
                          onDelete={() => deleteEntity("notebook", notebook.id)}
                          onDeleteDocument={(id) => deleteEntity("document", id)}
                          openMenu={openMenu}
                          setOpenMenu={setOpenMenu}
                          isExpanded={Boolean(expandedNotebooks[notebook.id])}
                          onToggleExpand={() => setExpandedNotebooks((prev) => ({ ...prev, [notebook.id]: !prev[notebook.id] }))}
                        />
                      ))}
                    </SortableContext>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-2 pb-1 text-[10px] font-bold text-slate-200 uppercase">Cuadernos sin carpeta</p>
            <SortableContext items={state.ungroupedNotebooks.map((notebook) => `notebook:${notebook.id}`)} strategy={verticalListSortingStrategy}>
              {state.ungroupedNotebooks.map((notebook) => (
                <NotebookRow
                  key={notebook.id}
                  notebook={notebook}
                  selectedDocId={selectedDocId}
                  rename={rename}
                  createDraft={createDraft}
                  inputRef={inputRef}
                  setRename={setRename}
                  setCreateDraft={setCreateDraft}
                  onCommit={commitInput}
                  onOpenNotebook={openNotebook}
                  onOpenDocument={openDocument}
                  onCreateDocument={() => startCreate("document", notebook.id)}
                  onRename={() => setRename({ id: notebook.id, type: "notebook", value: notebook.title || "" })}
                  onShare={() => setShareTarget({ type: "notebook", id: notebook.id })}
                  onShareDocument={(id) => setShareTarget({ type: "document", id })}
                  onDelete={() => deleteEntity("notebook", notebook.id)}
                  onDeleteDocument={(id) => deleteEntity("document", id)}
                  openMenu={openMenu}
                  setOpenMenu={setOpenMenu}
                  isExpanded={Boolean(expandedNotebooks[notebook.id])}
                  onToggleExpand={() => setExpandedNotebooks((prev) => ({ ...prev, [notebook.id]: !prev[notebook.id] }))}
                />
              ))}
            </SortableContext>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="text-[10px] font-bold text-slate-200 uppercase">Documentos sueltos</p>
            </div>
            <SortableContext items={state.standaloneDocs.map((doc) => `doc:${doc.id}`)} strategy={verticalListSortingStrategy}>
              {state.standaloneDocs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  document={doc}
                  isActive={selectedDocId === doc.id}
                  rename={rename}
                  createDraft={createDraft}
                  inputRef={inputRef}
                  setRename={setRename}
                  setCreateDraft={setCreateDraft}
                  onCommit={commitInput}
                  onOpen={openDocument}
                  onRename={() => setRename({ id: doc.id, type: "document", value: doc.title || "" })}
                  onShare={() => setShareTarget({ type: "document", id: doc.id })}
                  onDelete={() => deleteEntity("document", doc.id)}
                  openMenu={openMenu}
                  setOpenMenu={setOpenMenu}
                />
              ))}
            </SortableContext>
            <DropZone id="drop-notebook:" label="Soltar documento para dejarlo suelto" />
          </div>

          <div className="space-y-2">
            <p className="px-2 pb-1 text-[10px] font-bold text-slate-200 uppercase">Compartido conmigo</p>

            {state.sharedWithMeNotebooks.length === 0 && state.sharedWithMeDocs.length === 0 ? (
              <div className="mx-2 rounded-lg border border-dashed border-orion-border dark:border-orion-dark-border p-3 text-xs text-slate-400">
                No hay recursos compartidos.
              </div>
            ) : (
              <div className="space-y-1">
                {state.sharedWithMeNotebooks.map((item) => (
                  <button
                    key={`shared-notebook:${item.id}`}
                    type="button"
                    onClick={() => router.push(`/notebooks?notebook=${item.id}`)}
                    className="w-full text-left px-2 py-2 rounded-md hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-white text-sm">
                      <Share2 size={12} className="text-cyan-300" />
                      <Book size={14} className="text-blue-400" />
                      <span className="truncate font-medium">{item.title || "Sin titulo"}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 pl-5">
                      <span>{ownerName(item.owner)}</span>
                      <span className="mx-1">•</span>
                      <span>{roleLabel(item.permission)}</span>
                      <span className="mx-1">•</span>
                      <span>{new Date(item.sharedAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}

                {state.sharedWithMeDocs.map((item) => (
                  <button
                    key={`shared-doc:${item.id}`}
                    type="button"
                    onClick={() => router.push(`/notebooks?doc=${item.id}`)}
                    className="w-full text-left px-2 py-2 rounded-md hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-white text-sm">
                      <Share2 size={12} className="text-cyan-300" />
                      <FileText size={14} className="text-slate-300" />
                      <span className="truncate font-medium">{item.title || "Sin titulo"}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 pl-5">
                      <span>{ownerName(item.owner)}</span>
                      <span className="mx-1">•</span>
                      <span>{roleLabel(item.permission)}</span>
                      <span className="mx-1">•</span>
                      <span>{new Date(item.sharedAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {dragLabel ? <div className="px-3 py-1.5 rounded-md bg-orion-primary text-white text-xs">{dragLabel}</div> : null}
        </DragOverlay>
      </DndContext>
      </div>

      {shareTarget && (
        <ShareAccessModal
          open={Boolean(shareTarget)}
          targetId={shareTarget.id}
          targetType={shareTarget.type}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  );
}

interface NotebookRowProps {
  notebook: ExplorerNotebook;
  selectedDocId: string | null;
  rename: RenameState | null;
  createDraft: DraftCreateState | null;
  inputRef: RefObject<HTMLInputElement | null>;
  setRename: Dispatch<SetStateAction<RenameState | null>>;
  setCreateDraft: Dispatch<SetStateAction<DraftCreateState | null>>;
  onCommit: () => Promise<void>;
  onOpenNotebook: (id: string) => void;
  onOpenDocument: (id: string) => void;
  onCreateDocument: () => void;
  onRename: () => void;
  onShare: () => void;
  onShareDocument: (id: string) => void;
  onDelete: () => void;
  onDeleteDocument: (id: string) => void;
  openMenu: { type: "folder" | "notebook" | "document"; id: string } | null;
  setOpenMenu: Dispatch<SetStateAction<{ type: "folder" | "notebook" | "document"; id: string } | null>>;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const NotebookRow = memo(function NotebookRow({
  notebook,
  selectedDocId,
  rename,
  createDraft,
  inputRef,
  setRename,
  setCreateDraft,
  onCommit,
  onOpenNotebook,
  onOpenDocument,
  onCreateDocument,
  onRename,
  onShare,
  onShareDocument,
  onDelete,
  onDeleteDocument,
  openMenu,
  setOpenMenu,
  isExpanded,
  onToggleExpand,
}: NotebookRowProps) {
  const isEditing =
    (rename?.id === notebook.id && rename.type === "notebook") ||
    (createDraft?.id === notebook.id && createDraft.type === "notebook");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `notebook:${notebook.id}`,
    disabled: isEditing,
  });
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
    }

    clickTimer.current = setTimeout(() => {
      if (!isEditing) {
        onOpenNotebook(notebook.id);
      }
    }, 170);
  };

  const handleDoubleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    if (!isEditing) {
      setRename({ id: notebook.id, type: "notebook", value: notebook.title });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}
      className="space-y-1"
      {...(isEditing ? {} : attributes)}
      {...(isEditing ? {} : listeners)}
    >
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-800/80 text-white transition-colors"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpenMenu({ type: "notebook", id: notebook.id });
        }}
      >
        <button type="button" onClick={(event) => { event.stopPropagation(); onToggleExpand(); }} className="p-0.5">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {rename?.id === notebook.id && rename.type === "notebook" ? (
          <input
            ref={inputRef}
            value={rename.value}
            onChange={(event) => setRename((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
            onBlur={() => void onCommit()}
            onKeyDown={(event) => event.key === "Enter" && void onCommit()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            className="w-full bg-transparent text-sm outline-none text-white"
          />
        ) : createDraft?.id === notebook.id && createDraft.type === "notebook" ? (
          <input
            ref={inputRef}
            value={createDraft.value}
            onChange={(event) => setCreateDraft((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
            onBlur={() => void onCommit()}
            onKeyDown={(event) => event.key === "Enter" && void onCommit()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            className="w-full bg-transparent text-sm outline-none text-white"
            placeholder="Nombre de cuaderno"
          />
        ) : (
          <>
            <Book size={15} className="text-blue-400" />
            <span className="truncate text-sm text-white flex-1 min-w-0">{notebook.title || "Sin titulo"}</span>
            {notebook.isSharedWithMe ? <Share2 size={12} className="text-cyan-300 ml-auto shrink-0" aria-label="Compartido contigo" /> : null}
          </>
        )}

        <div className="relative ml-auto" data-row-menu="true">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpenMenu((prev) =>
                prev?.type === "notebook" && prev.id === notebook.id ? null : { type: "notebook", id: notebook.id },
              );
            }}
            className="p-1 rounded-md hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
            aria-label="Opciones cuaderno"
            title="Opciones"
          >
            <MoreHorizontal size={13} />
          </button>
          {openMenu?.type === "notebook" && openMenu.id === notebook.id ? (
            <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-orion-border dark:border-orion-dark-border bg-slate-900 shadow-xl overflow-hidden">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenu(null);
                  onRename();
                }}
                className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-800"
              >
                Renombrar
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenu(null);
                  onCreateDocument();
                }}
                className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-800"
              >
                Anadir documento
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenu(null);
                  onShare();
                }}
                className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-800"
              >
                Compartir
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenu(null);
                  void onDelete();
                }}
                className="w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10"
              >
                Eliminar
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <DropZone id={`drop-notebook:${notebook.id}`} label="Soltar documento en cuaderno" />

      {isExpanded && (
        <div className="ml-6 pl-2 border-l border-orion-border dark:border-orion-dark-border space-y-1">
          <SortableContext items={notebook.documents.map((doc) => `doc:${doc.id}`)} strategy={verticalListSortingStrategy}>
            {notebook.documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                isActive={selectedDocId === doc.id}
                rename={rename}
                createDraft={createDraft}
                inputRef={inputRef}
                setRename={setRename}
                setCreateDraft={setCreateDraft}
                onCommit={onCommit}
                onOpen={onOpenDocument}
                onRename={() => setRename({ id: doc.id, type: "document", value: doc.title || "" })}
                onShare={() => onShareDocument(doc.id)}
                onDelete={() => onDeleteDocument(doc.id)}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
});

interface DocumentRowProps {
  document: ExplorerDocument;
  isActive: boolean;
  rename: RenameState | null;
  createDraft: DraftCreateState | null;
  inputRef: RefObject<HTMLInputElement | null>;
  setRename: Dispatch<SetStateAction<RenameState | null>>;
  setCreateDraft: Dispatch<SetStateAction<DraftCreateState | null>>;
  onCommit: () => Promise<void>;
  onOpen: (id: string) => void;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
  openMenu: { type: "folder" | "notebook" | "document"; id: string } | null;
  setOpenMenu: Dispatch<SetStateAction<{ type: "folder" | "notebook" | "document"; id: string } | null>>;
}

const DocumentRow = memo(function DocumentRow({
  document,
  isActive,
  rename,
  createDraft,
  inputRef,
  setRename,
  setCreateDraft,
  onCommit,
  onOpen,
  onRename,
  onShare,
  onDelete,
  openMenu,
  setOpenMenu,
}: DocumentRowProps) {
  const isEditing =
    (rename?.id === document.id && rename.type === "document") ||
    (createDraft?.id === document.id && createDraft.type === "document");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `doc:${document.id}`,
    disabled: isEditing,
  });
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
    }

    clickTimer.current = setTimeout(() => {
      if (!isEditing) {
        onOpen(document.id);
      }
    }, 170);
  };

  const handleDoubleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    if (!isEditing) {
      setRename({ id: document.id, type: "document", value: document.title });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
        isActive ? "bg-orion-primary/20 text-white ring-1 ring-orion-primary/40" : "hover:bg-slate-800/80 text-white"
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpenMenu({ type: "document", id: document.id });
      }}
      {...(isEditing ? {} : attributes)}
      {...(isEditing ? {} : listeners)}
    >
      {rename?.id === document.id && rename.type === "document" ? (
        <input
          ref={inputRef}
          value={rename.value}
          onChange={(event) => setRename((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
          onBlur={() => void onCommit()}
          onKeyDown={(event) => event.key === "Enter" && void onCommit()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="w-full bg-transparent text-sm outline-none text-white"
        />
      ) : createDraft?.id === document.id && createDraft.type === "document" ? (
        <input
          ref={inputRef}
          value={createDraft.value}
          onChange={(event) => setCreateDraft((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
          onBlur={() => void onCommit()}
          onKeyDown={(event) => event.key === "Enter" && void onCommit()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="w-full bg-transparent text-sm outline-none text-white"
          placeholder="Nombre de documento"
        />
      ) : (
        <>
          <FileText size={14} className="text-slate-300" />
          <span className="truncate text-sm text-white flex-1 min-w-0">{document.title || "Sin titulo"}</span>
          {document.isSharedWithMe ? <Share2 size={12} className="text-cyan-300 ml-auto shrink-0" aria-label="Compartido contigo" /> : null}
          <div className="relative ml-auto" data-row-menu="true">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpenMenu((prev) =>
                  prev?.type === "document" && prev.id === document.id ? null : { type: "document", id: document.id },
                );
              }}
              className="p-1 rounded-md hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
              aria-label="Opciones documento"
              title="Opciones"
            >
              <MoreHorizontal size={12} />
            </button>
            {openMenu?.type === "document" && openMenu.id === document.id ? (
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-orion-border dark:border-orion-dark-border bg-slate-900 shadow-xl overflow-hidden">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenu(null);
                    onRename();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-800"
                >
                  Renombrar
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenu(null);
                    onShare();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-800"
                >
                  Compartir
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenu(null);
                    void onDelete();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10"
                >
                  Eliminar
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
});

function DropZone({ id, label }: { id: string; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`h-2 mx-2 rounded-full transition-colors ${isOver ? "bg-orion-primary/40" : "bg-transparent"}`}
      aria-label={label}
      title={label}
    />
  );
}

function roleLabel(role: "OWNER" | "EDITOR" | "READER"): string {
  if (role === "EDITOR") {
    return "Puede editar";
  }
  if (role === "OWNER") {
    return "Owner";
  }
  return "Solo lectura";
}

function ownerName(owner: SharedOwner): string {
  const fullName = `${owner.firstName || ""} ${owner.lastName || ""}`.trim();
  return fullName || owner.username;
}
