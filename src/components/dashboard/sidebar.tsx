"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  KanbanSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  ChevronDown,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useTransition, useEffect } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOut, switchWorkspace } from "@/app/(dashboard)/actions";
import type { ActiveWorkspace } from "@/lib/workspace-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  workspaces: ActiveWorkspace[];
  currentWorkspaceId: string;
  isSuperAdmin?: boolean;
}

// ─── Conteúdo interno da sidebar (reutilizado em desktop e drawer) ────────────
function SidebarContent({
  collapsed,
  workspaces,
  currentWorkspaceId,
  isSuperAdmin,
  onNavigate,
}: {
  collapsed: boolean;
  workspaces: ActiveWorkspace[];
  currentWorkspaceId: string;
  isSuperAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
  const otherWorkspaces  = workspaces.filter(w => w.id !== currentWorkspaceId);
  const hasMultiple      = workspaces.length > 1;

  function handleSwitch(id: string) {
    setSwitcherOpen(false);
    onNavigate?.();
    startTransition(() => switchWorkspace(id));
  }

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4 shrink-0">
        {!collapsed && (
          <span className="text-lg font-bold text-primary">CRM Vendas</span>
        )}
      </div>

      {/* Workspace switcher */}
      {hasMultiple && (
        <div className="border-b p-3 shrink-0">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            disabled={isPending}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              collapsed && "justify-center"
            )}
          >
            <Building2 size={18} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">
                  {isPending ? "Trocando..." : (currentWorkspace?.name ?? "Empresa")}
                </span>
                <ChevronDown size={14} className={cn("shrink-0 transition-transform", switcherOpen && "rotate-180")} />
              </>
            )}
          </button>

          {switcherOpen && !collapsed && (
            <div className="mt-1 overflow-hidden rounded-md border border-border/50 bg-background shadow-sm">
              {otherWorkspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => handleSwitch(ws.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className="h-5 w-5 shrink-0 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                    {ws.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="truncate">{ws.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              pathname === href
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Admin SaaS */}
      {isSuperAdmin && (
        <div className="border-t p-3 shrink-0">
          <Link
            href="/admin"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "text-primary hover:bg-primary/10",
              collapsed && "justify-center"
            )}
          >
            <ShieldCheck size={18} className="shrink-0" />
            {!collapsed && <span>Admin SaaS</span>}
          </Link>
        </div>
      )}

      {/* Theme + Sign out */}
      <div className="border-t p-3 space-y-1 shrink-0">
        <div className={cn("flex items-center px-3 py-2", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && <span className="text-xs text-muted-foreground">Tema</span>}
          <ThemeToggle />
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </form>
      </div>
    </>
  );
}

// ─── Sidebar principal ────────────────────────────────────────────────────────
export function Sidebar({ workspaces, currentWorkspaceId, isSuperAdmin = false }: SidebarProps) {
  const [collapsed, setCollapsed]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer ao mudar de rota
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Impede scroll do body quando drawer aberto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const sharedProps = { workspaces, currentWorkspaceId, isSuperAdmin };

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside
        className={cn(
          "relative hidden md:flex h-screen flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
        <SidebarContent collapsed={collapsed} {...sharedProps} />
      </aside>

      {/* ── Mobile: botão hamburger ── */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 flex h-9 w-9 items-center justify-center rounded-xl border bg-card shadow-md text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {/* ── Mobile: overlay + drawer ── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card shadow-2xl">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Fechar menu"
            >
              <X size={16} />
            </button>
            <SidebarContent
              collapsed={false}
              {...sharedProps}
              onNavigate={() => setDrawerOpen(false)}
            />
          </aside>
        </>
      )}
    </>
  );
}
