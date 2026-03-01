import { requireAdmin } from "@/lib/utils/admin";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
