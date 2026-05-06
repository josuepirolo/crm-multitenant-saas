"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, UserCheck, Briefcase, Pencil, Check, PowerOff, Power, Eye, ChevronDown, ChevronUp, Save } from "lucide-react";
import { ROLE_LABELS, ROLE_COLORS, ASSIGNABLE_ROLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { MemberRole, WorkspaceMemberWithProfile, WorkspaceWithStats } from "@/types";
import { appleEase } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { startImpersonation } from "@/app/(admin)/admin/impersonation-actions";
import { updateWorkspaceProfileAdmin } from "@/app/(admin)/admin/actions";
import { toast } from "sonner";

interface WorkspaceDetailPanelProps {
  workspace: WorkspaceWithStats | null;
  members: WorkspaceMemberWithProfile[];
  loading: boolean;
  onClose: () => void;
  onUpdateName: (workspaceId: string, name: string) => Promise<void>;
  onSetActive: (workspaceId: string, active: boolean) => Promise<void>;
  onChangeMemberRole: (memberId: string, role: MemberRole) => Promise<void>;
}

const ALL_ROLES: MemberRole[] = ["owner", ...ASSIGNABLE_ROLES];

const PROFILE_FIELDS = [
  { key: "display_name",       label: "Nome de exibição",  placeholder: "" },
  { key: "legal_name",         label: "Razão social",      placeholder: "" },
  { key: "document",           label: "CNPJ / CPF",        placeholder: "00.000.000/0001-00" },
  { key: "phone",              label: "Telefone",          placeholder: "(11) 99999-9999" },
  { key: "email",              label: "E-mail",            placeholder: "" },
  { key: "address_street",     label: "Rua",               placeholder: "" },
  { key: "address_number",     label: "Número",            placeholder: "" },
  { key: "address_complement", label: "Complemento",       placeholder: "" },
  { key: "address_district",   label: "Bairro",            placeholder: "" },
  { key: "address_city",       label: "Cidade",            placeholder: "" },
  { key: "address_state",      label: "Estado",            placeholder: "SP" },
  { key: "address_zipcode",    label: "CEP",               placeholder: "00000-000" },
] as const;

type ProfileKey = typeof PROFILE_FIELDS[number]["key"];

export function WorkspaceDetailPanel({
  workspace, members, loading, onClose,
  onUpdateName, onSetActive, onChangeMemberRole,
}: WorkspaceDetailPanelProps) {
  const [editingName, setEditingName]         = useState(false);
  const [nameValue, setNameValue]             = useState("");
  const [savingName, setSavingName]           = useState(false);
  const [togglingActive, setTogglingActive]   = useState(false);
  const [profileOpen, setProfileOpen]         = useState(false);
  const [editingProfile, setEditingProfile]   = useState(false);
  const [profileValues, setProfileValues]     = useState<Partial<Record<ProfileKey, string>>>({});
  const [savingProfile, startSaveProfile]     = useTransition();
  const [isImpersonating, startImpersonating] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) inputRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    setEditingName(false);
    setProfileOpen(false);
    setEditingProfile(false);
  }, [workspace?.id]);

  function startEditName() {
    setNameValue(workspace?.name ?? "");
    setEditingName(true);
  }

  async function commitName() {
    if (!workspace || !nameValue.trim() || nameValue.trim() === workspace.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    await onUpdateName(workspace.id, nameValue);
    setSavingName(false);
    setEditingName(false);
  }

  async function handleToggleActive() {
    if (!workspace) return;
    setTogglingActive(true);
    await onSetActive(workspace.id, !workspace.is_active);
    setTogglingActive(false);
  }

  function openProfileEdit() {
    if (!workspace) return;
    const vals: Partial<Record<ProfileKey, string>> = {};
    PROFILE_FIELDS.forEach(({ key }) => {
      vals[key] = (workspace[key as keyof WorkspaceWithStats] as string | null) ?? "";
    });
    setProfileValues(vals);
    setEditingProfile(true);
  }

  function saveProfile() {
    if (!workspace) return;
    startSaveProfile(async () => {
      const fd = new FormData();
      (Object.entries(profileValues) as [string, string][]).forEach(([k, v]) => {
        fd.append(k, v);
      });

      const promise = updateWorkspaceProfileAdmin(workspace.id, null, fd).then((r) => {
        if (r.error) throw new Error(r.error);
        return r;
      });

      toast.promise(promise, {
        loading: "Salvando...",
        success: "Dados atualizados!",
        error:   (err: Error) => err.message,
      });

      try {
        await promise;
        setEditingProfile(false);
      } catch { /* handled by toast */ }
    });
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR");

  return (
    <AnimatePresence>
      {workspace && (
        <>
          {/* Overlay mobile */}
          <div
            className="sm:hidden fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
        <motion.div
          key="panel"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: appleEase }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-sm sm:w-80 sm:relative sm:inset-auto sm:z-auto shrink-0 border-l border-border/50 bg-card flex flex-col h-full overflow-hidden shadow-2xl sm:shadow-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-border/50 gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0 overflow-hidden">
                  {workspace.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={workspace.logo_url} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    workspace.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                {!workspace.is_active && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
                    Inativa
                  </span>
                )}
              </div>

              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    ref={inputRef}
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    className="h-7 flex-1 rounded-lg border border-primary/40 bg-background px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                    disabled={savingName}
                  />
                  <button
                    onClick={commitName}
                    disabled={savingName}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Check size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <h3 className="font-semibold truncate">
                    {workspace.display_name ?? workspace.name}
                  </h3>
                  <button
                    onClick={startEditName}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-0.5">{workspace.slug}</p>
              {(workspace.niche_name || workspace.parent_niche_name) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {workspace.parent_niche_name
                    ? `${workspace.parent_niche_name} › ${workspace.niche_name}`
                    : workspace.niche_name}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50">
            {[
              { icon: Users,     label: "Membros",  value: workspace.member_count },
              { icon: UserCheck, label: "Contatos", value: workspace.contact_count },
              { icon: Briefcase, label: "Deals",    value: workspace.deal_count },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1 py-4">
                <Icon size={15} className="text-muted-foreground" />
                <span className="text-lg font-bold tabular-nums">{fmt(value)}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Members list */}
            <p className="px-5 py-3 text-xs font-medium text-muted-foreground border-b border-border/50">
              Membros ativos
            </p>

            {loading ? (
              <div className="divide-y divide-border/50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sem membros.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {members.map((m) => {
                  const name     = m.profiles?.name ?? "Sem nome";
                  const initials = name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 overflow-hidden">
                        {m.profiles?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.profiles.avatar_url} alt={name} className="h-full w-full object-cover" />
                        ) : initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.profiles?.email ?? "—"}</p>
                      </div>
                      <select
                        value={m.role}
                        onChange={(e) => onChangeMemberRole(m.id, e.target.value as MemberRole)}
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
                          ROLE_COLORS[m.role]
                        )}
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dados cadastrais */}
            <div className="border-t border-border/50">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Dados cadastrais</span>
                {profileOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {profileOpen && (
                <div className="px-5 pb-4 space-y-3">
                  {!editingProfile ? (
                    <>
                      <div className="space-y-1.5">
                        {PROFILE_FIELDS.map(({ key, label }) => {
                          const val = workspace[key as keyof WorkspaceWithStats] as string | null;
                          if (!val) return null;
                          return (
                            <div key={key} className="flex gap-2 text-xs">
                              <span className="text-muted-foreground shrink-0 w-28">{label}</span>
                              <span className="truncate">{val}</span>
                            </div>
                          );
                        })}
                        {PROFILE_FIELDS.every(({ key }) => !workspace[key as keyof WorkspaceWithStats]) && (
                          <p className="text-xs text-muted-foreground">Nenhum dado cadastral preenchido.</p>
                        )}
                      </div>
                      <button
                        onClick={openProfileEdit}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        <Pencil size={11} />
                        Editar dados cadastrais
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
                        <div key={key} className="space-y-0.5">
                          <label className="text-xs text-muted-foreground">{label}</label>
                          <input
                            value={profileValues[key] ?? ""}
                            onChange={(e) =>
                              setProfileValues((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={placeholder}
                            maxLength={key === "address_state" ? 2 : undefined}
                            className="w-full h-7 rounded-lg border border-border/60 bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={saveProfile}
                          disabled={savingProfile}
                          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <Save size={11} />
                          {savingProfile ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          onClick={() => setEditingProfile(false)}
                          className="flex-1 h-7 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer — ações + data */}
          <div className="p-4 border-t border-border/50 space-y-2">
            {workspace.is_active && (
              <button
                onClick={() => startImpersonating(() => startImpersonation(workspace.id))}
                disabled={isImpersonating}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200 disabled:opacity-50"
              >
                <Eye size={14} />
                {isImpersonating ? "Entrando..." : "Visualizar como empresa"}
              </button>
            )}
            <button
              onClick={handleToggleActive}
              disabled={togglingActive}
              className={cn(
                "w-full flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50",
                workspace.is_active
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              {workspace.is_active ? (
                <><PowerOff size={14} /> Desativar empresa</>
              ) : (
                <><Power size={14} /> Reativar empresa</>
              )}
            </button>
            <p className="text-xs text-muted-foreground text-center pt-1">
              Criado em {new Date(workspace.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
