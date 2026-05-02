import { getSessionUser } from "../auth";
import { resolveSessionUserId } from "../session-user";

export async function resolveAiActorUserId(): Promise<string | null> {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return null;
  }

  return resolveSessionUserId(sessionUser);
}
