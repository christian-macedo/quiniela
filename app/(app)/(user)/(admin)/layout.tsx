import { requireAdmin } from "@/lib/utils/admin";
import { redirect } from "next/navigation";

// This server-side layout is the real security boundary for all admin routes.
// Any admin UI checks in client components (e.g. hiding buttons) are UX-only —
// this layout is what actually prevents unauthorized access.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
