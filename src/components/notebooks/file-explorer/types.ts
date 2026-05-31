export interface ExplorerDocument {
  id: string;
  title: string;
  notebookId: string | null;
  position: number;
  isPublic?: boolean;
  isSharedWithMe?: boolean;
  currentUserRole?: "OWNER" | "EDITOR" | "READER" | null;
}

export interface ExplorerNotebook {
  id: string;
  title: string;
  color: string | null;
  folderId: string | null;
  isPublic?: boolean;
  documents: ExplorerDocument[];
  isSharedWithMe?: boolean;
  currentUserRole?: "OWNER" | "EDITOR" | "READER" | null;
}

export interface SharedOwner {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

export interface SharedWithMeNotebook {
  id: string;
  title: string;
  color: string | null;
  permission: "OWNER" | "EDITOR" | "READER";
  sharedAt: string;
  owner: SharedOwner;
}

export interface SharedWithMeDocument {
  id: string;
  title: string;
  notebookId: string | null;
  permission: "OWNER" | "EDITOR" | "READER";
  sharedAt: string;
  owner: SharedOwner;
}

export interface SharedWithMeData {
  folders?: {
    id: string;
    name: string;
    permission: "OWNER" | "EDITOR" | "READER";
    sharedAt: string;
  }[];
  notebooks: SharedWithMeNotebook[];
  documents: SharedWithMeDocument[];
}

export interface ExplorerFolder {
  id: string;
  name: string;
  isPublic?: boolean;
  notebooks: ExplorerNotebook[];
}

export interface ExplorerState {
  folders: ExplorerFolder[];
  ungroupedNotebooks: ExplorerNotebook[];
  standaloneDocs: ExplorerDocument[];
  sharedWithMeFolders: {
    id: string;
    name: string;
    permission: "OWNER" | "EDITOR" | "READER";
    sharedAt: string;
  }[];
  sharedWithMeNotebooks: SharedWithMeNotebook[];
  sharedWithMeDocs: SharedWithMeDocument[];
}

export interface ExplorerLoadWarnings {
  folders?: string;
  notebooks?: string;
  standaloneDocs?: string;
  sharedWithMe?: string;
}

export interface ToastMessage {
  id: string;
  type: "error" | "success";
  text: string;
}

export type DraftType = "folder" | "notebook" | "document";
export type ExplorerEntityType = "folder" | "notebook" | "document";

export interface RenameState {
  id: string;
  type: DraftType;
  value: string;
}

export interface DraftCreateState {
  id: string;
  type: DraftType;
  parentId: string | null;
  value: string;
}

export interface OpenMenuState {
  type: ExplorerEntityType;
  id: string;
}
