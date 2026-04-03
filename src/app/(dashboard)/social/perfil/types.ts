export type ProfileVisibility = "PUBLIC" | "PRIVATE";
export type UserRole = "USER" | "ADMIN";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  profileVisibility: ProfileVisibility;
  role: UserRole;
  isActive: boolean;
  name: string;
  tag: string;
}

export interface PublicProject {
  id: string;
  name: string;
  isPublic: boolean;
  ownerId: string;
  creatorId: string;
}

export interface PublicNotebook {
  id: string;
  title: string;
  isPublic: boolean;
  ownerId: string;
  creatorId: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AdminSettings {
  allowRegistration: boolean;
}

export interface CreateAdminUserPayload {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}
