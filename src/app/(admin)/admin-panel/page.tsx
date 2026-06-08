import { redirect } from "next/navigation";

export default function AdminPanelRootPage() {
  redirect("/admin-panel/users");
}
