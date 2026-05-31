import type {
  DraftCreateState,
  ExplorerDocument,
  ExplorerEntityType,
  ExplorerFolder,
  ExplorerLoadWarnings,
  ExplorerNotebook,
  ExplorerState,
  RenameState,
  SharedWithMeData,
} from "./types";

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchExplorerState(): Promise<{ data: ExplorerState; warnings: ExplorerLoadWarnings }> {
  const [foldersRes, notebooksRes, standaloneDocsRes, sharedWithMeRes] = await Promise.all([
    fetch("/api/notebooks/folders"),
    fetch("/api/notebooks"),
    fetch("/api/notebooks/documents?standalone=true"),
    fetch("/api/notebooks/shared-with-me"),
  ]);

  const warnings: ExplorerLoadWarnings = {};

  const folders = foldersRes.ok ? ((await foldersRes.json()) as ExplorerFolder[]) : [];
  if (!foldersRes.ok) {
    warnings.folders = "Carpetas no disponibles";
  }

  const notebooks = notebooksRes.ok ? ((await notebooksRes.json()) as ExplorerNotebook[]) : [];
  if (!notebooksRes.ok) {
    warnings.notebooks = "Cuadernos no disponibles";
  }

  const standaloneDocs = standaloneDocsRes.ok ? ((await standaloneDocsRes.json()) as ExplorerDocument[]) : [];
  if (!standaloneDocsRes.ok) {
    warnings.standaloneDocs = "Documentos sueltos no disponibles";
  }

  const sharedWithMe = sharedWithMeRes.ok
    ? ((await sharedWithMeRes.json()) as SharedWithMeData)
    : { folders: [], notebooks: [], documents: [] };
  if (!sharedWithMeRes.ok) {
    warnings.sharedWithMe = "Compartidos no disponibles";
  }

  return {
    data: {
      folders,
      standaloneDocs,
      ungroupedNotebooks: notebooks.filter((notebook) => !notebook.folderId),
      sharedWithMeFolders: sharedWithMe.folders ?? [],
      sharedWithMeNotebooks: sharedWithMe.notebooks ?? [],
      sharedWithMeDocs: sharedWithMe.documents ?? [],
    },
    warnings,
  };
}

export async function renameExplorerEntity(
  renameState: RenameState,
  findNotebook: (id: string) => ExplorerNotebook | null,
): Promise<void> {
  const value = renameState.value.trim();
  if (!value) {
    return;
  }

  if (renameState.type === "folder") {
    const response = await fetch("/api/notebooks/folders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: renameState.id, name: value }),
    });
    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo renombrar la carpeta"));
    }
    return;
  }

  if (renameState.type === "notebook") {
    const notebook = findNotebook(renameState.id);
    if (!notebook) {
      return;
    }

    const response = await fetch(`/api/notebooks/${renameState.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value }),
    });
    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo renombrar el cuaderno"));
    }
    return;
  }

  const response = await fetch(`/api/notebooks/documents/${renameState.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: value }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo renombrar el documento"));
  }
}

export async function createExplorerEntity(draft: DraftCreateState): Promise<{ id?: string }> {
  const value = draft.value.trim();
  if (!value) {
    return {};
  }

  if (draft.type === "folder") {
    const folderRes = await fetch("/api/notebooks/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
    });

    if (!folderRes.ok) {
      throw new Error(await parseError(folderRes, "No se pudo crear la carpeta"));
    }
    return {};
  }

  if (draft.type === "notebook") {
    const response = await fetch("/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: value,
        description: "",
        folderId: draft.parentId,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo crear el cuaderno"));
    }
    return {};
  }

  const response = await fetch("/api/notebooks/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: value,
      notebookId: draft.parentId,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo crear el documento"));
  }

  return (await response.json()) as { id: string };
}

export async function deleteExplorerEntity(type: ExplorerEntityType, id: string): Promise<void> {
  if (type === "folder") {
    const response = await fetch("/api/notebooks/folders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo eliminar la carpeta"));
    }
    return;
  }

  if (type === "notebook") {
    const response = await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo eliminar el cuaderno"));
    }
    return;
  }

  const response = await fetch(`/api/notebooks/documents/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo eliminar el documento"));
  }
}

export async function setExplorerEntityVisibility(type: ExplorerEntityType, id: string, isPublic: boolean): Promise<void> {
  if (type === "folder") {
    const response = await fetch("/api/notebooks/folders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isPublic }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo actualizar la visibilidad de la carpeta"));
    }
    return;
  }

  if (type === "notebook") {
    const response = await fetch(`/api/notebooks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo actualizar la visibilidad del cuaderno"));
    }
    return;
  }

  const response = await fetch(`/api/notebooks/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPublic }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo actualizar la visibilidad del documento"));
  }
}
