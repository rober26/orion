import { AccessRole, ConnectionStatus, Prisma, ProjectRole } from "@prisma/client";
import prisma from "@/src/lib/prisma";

const editorRoles: AccessRole[] = [AccessRole.OWNER, AccessRole.EDITOR];

const projectEditorRoles: ProjectRole[] = [ProjectRole.OWNER, ProjectRole.MEMBER];
const projectOwnerRoles: ProjectRole[] = [ProjectRole.OWNER];

export function projectAccessWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { creatorId: userId },
      { users: { some: { userId } } },
    ],
  };
}

export function projectEditorWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { creatorId: userId },
      { users: { some: { userId, role: { in: projectEditorRoles } } } },
    ],
  };
}

export function projectOwnerWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { creatorId: userId },
      { users: { some: { userId, role: { in: projectOwnerRoles } } } },
    ],
  };
}

export function normalizeProjectRole(role: ProjectRole): "OWNER" | "MEMBER" | "VIEWER" {
  if (role === ProjectRole.OWNER) {
    return "OWNER";
  }

  if (role === ProjectRole.MEMBER) {
    return "MEMBER";
  }

  return "VIEWER";
}

export function parseProjectMemberRole(value: unknown): ProjectRole | null {
  if (value === ProjectRole.MEMBER || value === ProjectRole.VIEWER) {
    return value;
  }

  return null;
}

export async function canViewProject(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...projectAccessWhere(userId),
    },
    select: { id: true },
  });

  return Boolean(project);
}

export async function canEditProjectContent(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...projectEditorWhere(userId),
    },
    select: { id: true },
  });

  return Boolean(project);
}

export async function canManageProjectMembers(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...projectOwnerWhere(userId),
    },
    select: { id: true },
  });

  return Boolean(project);
}

export function notebookAccessWhere(userId: string): Prisma.NotebookWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { creatorId: userId },
      { users: { some: { userId } } },
      { folder: { project: projectAccessWhere(userId) } },
    ],
  };
}

export function notebookEditorWhere(userId: string): Prisma.NotebookWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { creatorId: userId },
      { users: { some: { userId, role: { in: editorRoles } } } },
      { folder: { project: projectEditorWhere(userId) } },
    ],
  };
}

export function folderAccessWhere(userId: string): Prisma.NotebookFolderWhereInput {
  return {
    OR: [
      { project: projectAccessWhere(userId) },
      {
        notebooks: {
          some: {
            OR: [
              { ownerId: userId },
              { creatorId: userId },
              { users: { some: { userId } } },
            ],
          },
        },
      },
    ],
  };
}

export function folderEditorWhere(userId: string): Prisma.NotebookFolderWhereInput {
  return {
    OR: [
      {
        project: {
          OR: [{ ownerId: userId }, { creatorId: userId }],
        },
      },
      {
        notebooks: {
          some: {
            OR: [
              { ownerId: userId },
              { creatorId: userId },
              { users: { some: { userId, role: { in: editorRoles } } } },
            ],
          },
        },
      },
    ],
  };
}

export function documentAccessWhere(userId: string): Prisma.DocumentWhereInput {
  return {
    OR: [
      { creatorId: userId },
      { users: { some: { userId } } },
      { notebook: notebookAccessWhere(userId) },
      { project: projectAccessWhere(userId) },
    ],
  };
}

export function documentEditorWhere(userId: string): Prisma.DocumentWhereInput {
  return {
    OR: [
      { creatorId: userId },
      { users: { some: { userId, role: { in: editorRoles } } } },
      { notebook: notebookEditorWhere(userId) },
      { project: projectEditorWhere(userId) },
    ],
  };
}

export async function canManageNotebookMembers(notebookId: string, userId: string): Promise<boolean> {
  const notebook = await prisma.notebook.findFirst({
    where: {
      id: notebookId,
      OR: [
        { ownerId: userId },
        { creatorId: userId },
        { users: { some: { userId, role: { in: editorRoles } } } },
      ],
    },
    select: { id: true },
  });

  return Boolean(notebook);
}

export async function canManageFolderMembers(folderId: string, userId: string): Promise<boolean> {
  const folder = await prisma.notebookFolder.findFirst({
    where: {
      id: folderId,
      OR: [
        {
          project: {
            OR: [{ ownerId: userId }, { creatorId: userId }],
          },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(folder);
}

export async function canManageDocumentMembers(documentId: string, userId: string): Promise<boolean> {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [
        { creatorId: userId },
        { users: { some: { userId, role: { in: editorRoles } } } },
        {
          notebook: {
            OR: [
              { ownerId: userId },
              { creatorId: userId },
              { users: { some: { userId, role: { in: editorRoles } } } },
            ],
          },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(document);
}

export async function hasAcceptedConnection(userId: string, otherUserId: string): Promise<boolean> {
  const connection = await prisma.connection.findFirst({
    where: {
      status: ConnectionStatus.ACCEPTED,
      OR: [
        { requesterId: userId, receiverId: otherUserId },
        { requesterId: otherUserId, receiverId: userId },
      ],
    },
    select: { id: true },
  });

  return Boolean(connection);
}

export function parseAccessRole(value: unknown): AccessRole | null {
  if (value === AccessRole.READER || value === AccessRole.EDITOR) {
    return value;
  }

  return null;
}

export function roleCapabilities(role: AccessRole | null) {
  const canEdit = role === AccessRole.OWNER || role === AccessRole.EDITOR;
  const canShare = canEdit;
  const canDelete = role === AccessRole.OWNER;
  const canRequestEdit = role === AccessRole.READER;

  return {
    canEdit,
    canShare,
    canDelete,
    canRequestEdit,
  };
}
