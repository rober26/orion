import { redirect } from "next/navigation";

export default function NotesRedirectPage() {
  redirect("/notebooks?tab=quick-notes");
}
