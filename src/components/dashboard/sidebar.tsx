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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";
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
}

export function Sidebar({ workspaces, currentWorkspaceId }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
  const otherWorkspaces = workspaces.filter(w => w.id !== currentWorkspaceId);
  const hasMultiple = workspaces.length > 1;

  function handleSwitch(id: string) {
    setSwitcherOpen(false);
    startTransition(() => switchWorkspace(id));
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed && (
          <span className="text-lg font-bold text-primary">CRM Vendas</span>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Workspace switcher */}
      {hasMultiple && (
        <div className="border-b p-3">
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
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
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

      {/* Theme toggle + Sign out */}
      <div className="border-t p-3 space-y-1">
        <div className={cn("flex items-center px-3 py-2", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && <span className="text-xs text-muted-foreground">Tema</span>}
          <ThemeToggle />
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
