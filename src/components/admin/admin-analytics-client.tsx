"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getUserUsageDetails } from "@/app/(admin)/admin/analytics-actions";
import type { WorkspaceUsageSummary, UserUsageDetail } from "@/app/(admin)/admin/analytics-actions";

interface Props { summaries: WorkspaceUsageSummary[]; }

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60)   return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export function AdminAnalyticsClient({ summaries }: Props) {
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<WorkspaceUsageSummary | null>(null);
  const [users, setUsers]         = useState<UserUsageDetail[]>([]);
  const [isPending, startTransition] = useTransition();

  const filtered = summaries.filter(s =>
    !search || s.workspace_name.toLowerCase().includes(search.toLowerCase())
  );

  function openDrilldown(ws: WorkspaceUsageSummary) {
    setSelected(ws);
    setUsers([]);
    startTransition(async () => {
      const { data } = await getUserUsageDetails(ws.workspace_id, { days: 30 });
      setUsers(data);
    });
  }

  return (
    <div className="space-y-6">
      {/* Filtro */}
      <Input
        placeholder="Filtrar por workspace..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {/* Tabela de workspaces */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead className="text-right">Usuários ativos</TableHead>
              <TableHead className="text-right">Sessões</TableHead>
              <TableHead className="text-right">Inativos</TableHead>
              <TableHead>Áreas top</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum dado de acesso no período.
                </TableCell>
              </TableRow>
            ) : filtered.map(ws => (
              <TableRow key={ws.workspace_id} className={selected?.workspace_id === ws.workspace_id ? "bg-accent/40" : ""}>
                <TableCell className="font-medium text-sm">{ws.workspace_name}</TableCell>
                <TableCell className="text-right text-sm">{ws.active_users}</TableCell>
                <TableCell className="text-right text-sm">{ws.total_sessions}</TableCell>
                <TableCell className="text-right text-sm">
                  {ws.inactive_users > 0
                    ? <Badge variant="destructive" className="text-xs">{ws.inactive_users}</Badge>
                    : <span className="text-muted-foreground">0</span>
                  }
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {ws.top_areas.slice(0, 3).map(a => (
                      <Badge key={a.area} variant="secondary" className="text-xs">
                        {a.area} ({a.count})
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{relativeTime(ws.last_access)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openDrilldown(ws)}
                  >
                    Usuários
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Drill-down por workspace */}
      {selected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              Usuários — {selected.workspace_name}
            </h2>
            <button
              onClick={() => { setSelected(null); setUsers([]); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Fechar
            </button>
          </div>

          {isPending ? (
            <div className="rounded-xl border border-border/60 p-6 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Último login</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead className="text-right">Inativo (dias)</TableHead>
                    <TableHead>Áreas</TableHead>
                    <TableHead className="text-right">Eventos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">
                        Nenhum evento registrado no período.
                      </TableCell>
                    </TableRow>
                  ) : users
                    .sort((a, b) => (b.total_events - a.total_events))
                    .map(u => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="text-sm font-medium">{u.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{u.email ?? u.user_id.slice(0, 8)}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{relativeTime(u.last_login)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{relativeTime(u.last_access)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {u.inactive_days !== null && u.inactive_days > 7
                            ? <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">{u.inactive_days}d</Badge>
                            : <span>{u.inactive_days ?? "—"}</span>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.top_areas.slice(0, 3).map(a => (
                              <Badge key={a.area} variant="secondary" className="text-xs">
                                {a.area}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{u.total_events}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
