import type {
  AccessRequest,
  AdminSettings,
  AdminUser,
  CreateAdminUserPayload,
  ProfileVisibility,
  UserProfile,
  UserRole,
} from "../types";

interface ApiError {
  error: string;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json();

  if (!res.ok) {
    const message = (data as ApiError)?.error || "Ocurrió un error inesperado";
    throw new Error(message);
  }

  return data as T;
}

export async function getMyProfile(): Promise<UserProfile> {
  const res = await fetch("/api/users/me", { cache: "no-store" });
  return parseResponse<UserProfile>(res);
}

export async function updateMyProfile(payload: {
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  profileVisibility: ProfileVisibility;
}): Promise<UserProfile> {
  const res = await fetch("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<UserProfile>(res);
}

export async function uploadMyAvatar(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch("/api/users/me/avatar", {
    method: "POST",
    body: formData,
  });

  return parseResponse<{ avatarUrl: string }>(res);
}

export async function changeMyPassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const res = await fetch("/api/users/me/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ message: string }>(res);
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch("/api/admin/users", { cache: "no-store" });
  return parseResponse<AdminUser[]>(res);
}

export async function updateAdminUser(
  userId: string,
  payload: { role?: UserRole; isActive?: boolean },
): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<AdminUser>(res);
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUser> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<AdminUser>(res);
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const res = await fetch("/api/admin/settings", { cache: "no-store" });
  return parseResponse<AdminSettings>(res);
}

export async function updateAdminSettings(payload: AdminSettings): Promise<AdminSettings> {
  const res = await fetch("/api/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<AdminSettings>(res);
}

export async function getAdminAccessRequests(): Promise<AccessRequest[]> {
  const res = await fetch("/api/admin/access-requests", { cache: "no-store" });
  return parseResponse<AccessRequest[]>(res);
}

export async function reviewAdminAccessRequest(
  requestId: string,
  payload: { action: "approve" | "reject" },
): Promise<AccessRequest> {
  const res = await fetch(`/api/admin/access-requests/${requestId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<AccessRequest>(res);
}
