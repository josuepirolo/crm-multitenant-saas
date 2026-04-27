import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/dashboard/sidebar";
import { getActiveWorkspaceContext } from "@/lib/workspace-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspaces, currentWorkspaceId } = await getActiveWorkspaceContext();

  if (workspaces.length === 0) {
    redirect("/no-workspace");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar workspaces={workspaces} currentWorkspaceId={currentWorkspaceId!} />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
