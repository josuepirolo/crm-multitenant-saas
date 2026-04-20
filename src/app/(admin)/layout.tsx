import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/guards";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Toaster } from "sonner";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) notFound();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
