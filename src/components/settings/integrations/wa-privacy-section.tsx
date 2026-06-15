"use client";

import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type {
  WaPrivacySettings, WaPrivacyControl, WaVisibilitySetting, WaVisualizationType,
  WaBlacklistOp, WaReadReceiptsValue, WaMessagesDurationValue, WaDisallowedType,
} from "@/types";

const VIS_OPTS: { v: WaVisualizationType; label: string }[] = [
  { v: "ALL", label: "Todos" },
  { v: "NONE", label: "Ninguém" },
  { v: "CONTACT_BLACKLIST", label: "Exceto contatos" },
];

interface Handlers {
  onSaveVisibility: (s: WaVisibilitySetting, v: WaVisualizationType, bl?: WaBlacklistOp[]) => Promise<boolean>;
  onSaveGroupAdd: (v: WaVisualizationType, bl?: WaBlacklistOp[]) => Promise<boolean>;
  onSaveReadReceipts: (v: WaReadReceiptsValue) => Promise<boolean>;
  onSaveMessagesDuration: (v: WaMessagesDurationValue) => Promise<boolean>;
  loadDisallowed: (t: WaDisallowedType) => Promise<string[]>;
}

interface Props extends Handlers {
  privacy: WaPrivacySettings;
  canManage: boolean;
}

/** Retorna o visualizationType atual, ou undefined quando o controle nunca foi
 * sincronizado/definido (backend devolve null — Z-API não expõe leitura). */
function vizOf(c: WaPrivacyControl | null | undefined): WaVisualizationType | undefined {
  if (!c) return undefined;
  return (c.visualizationType ?? c.type) as WaVisualizationType | undefined;
}

export function WaPrivacySection({ privacy, canManage, ...h }: Props) {
  return (
    <div className="space-y-3">
      <VisibilityRow
        label="Visto por último" disallowed="lastSeen"
        viz={vizOf(privacy.last_seen)} canManage={canManage}
        onSave={(v, bl) => h.onSaveVisibility("last-seen", v, bl)} loadDisallowed={h.loadDisallowed}
      />
      <VisibilityRow
        label="Foto do perfil" disallowed="photo"
        viz={vizOf(privacy.photo)} canManage={canManage}
        onSave={(v, bl) => h.onSaveVisibility("photo", v, bl)} loadDisallowed={h.loadDisallowed}
      />
      <VisibilityRow
        label="Recados (descrição)" disallowed="description"
        viz={vizOf(privacy.description)} canManage={canManage}
        onSave={(v, bl) => h.onSaveVisibility("description", v, bl)} loadDisallowed={h.loadDisallowed}
      />
      {/* online não suporta lista de exceções no backend → apenas Todos/Ninguém */}
      <VisibilityRow
        label="Online" disallowed={null}
        viz={vizOf(privacy.online)} canManage={canManage}
        onSave={(v) => h.onSaveVisibility("online", v)} loadDisallowed={h.loadDisallowed}
      />
      <VisibilityRow
        label="Adicionar a grupos" disallowed="groupAdd"
        viz={vizOf(privacy.group_add)} canManage={canManage}
        onSave={(v, bl) => h.onSaveGroupAdd(v, bl)} loadDisallowed={h.loadDisallowed}
      />

      <SimpleSelectRow
        label="Confirmações de leitura" value={privacy.read_receipts} canManage={canManage}
        options={[{ v: "enable", label: "Ativado" }, { v: "disable", label: "Desativado" }]}
        onSave={(v) => h.onSaveReadReceipts(v as WaReadReceiptsValue)}
      />
      <SimpleSelectRow
        label="Mensagens temporárias" value={privacy.messages_duration} canManage={canManage}
        options={[
          { v: "disable", label: "Desativado" }, { v: "hours24", label: "24 horas" },
          { v: "days7", label: "7 dias" }, { v: "days90", label: "90 dias" },
        ]}
        onSave={(v) => h.onSaveMessagesDuration(v as WaMessagesDurationValue)}
      />
    </div>
  );
}

function Shell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="w-40 shrink-0">{children}</div>
      </div>
    </div>
  );
}

function SimpleSelectRow({
  label, value, options, canManage, onSave,
}: {
  label: string; value: string | null; canManage: boolean;
  options: { v: string; label: string }[];
  onSave: (v: string) => Promise<boolean>;
}) {
  const current = value ? options.find((o) => o.v === value) : undefined;
  if (!canManage) {
    return (
      <Shell label={label}>
        <span className="block text-right text-sm font-medium">
          {current?.label ?? <span className="text-muted-foreground">Não definido</span>}
        </span>
      </Shell>
    );
  }
  return (
    <Shell label={label}>
      <Select value={value ?? null} onValueChange={(v) => v && onSave(v)}>
        <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="Não definido" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Shell>
  );
}

function VisibilityRow({
  label, disallowed, viz, canManage, onSave, loadDisallowed,
}: {
  label: string;
  disallowed: WaDisallowedType | null;
  viz: WaVisualizationType | undefined;
  canManage: boolean;
  onSave: (v: WaVisualizationType, bl?: WaBlacklistOp[]) => Promise<boolean>;
  loadDisallowed: (t: WaDisallowedType) => Promise<string[]>;
}) {
  const [selected, setSelected] = useState<WaVisualizationType | undefined>(viz);
  useEffect(() => setSelected(viz), [viz]);

  const opts = disallowed ? VIS_OPTS : VIS_OPTS.filter((o) => o.v !== "CONTACT_BLACKLIST");
  const showEditor = selected === "CONTACT_BLACKLIST" && disallowed;

  function onChange(v: string | null) {
    if (!v) return;
    const next = v as WaVisualizationType;
    setSelected(next);
    // ALL/NONE aplica direto; CONTACT_BLACKLIST só aplica ao adicionar contato (editor abaixo)
    if (next !== "CONTACT_BLACKLIST") onSave(next);
  }

  return (
    <div className="rounded-xl border border-border/50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="w-40 shrink-0">
          {canManage ? (
            <Select value={selected ?? null} onValueChange={onChange}>
              <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="Não definido" /></SelectTrigger>
              <SelectContent>
                {opts.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <span className="block text-right text-sm font-medium">
              {VIS_OPTS.find((o) => o.v === viz)?.label ?? <span className="text-muted-foreground">Não definido</span>}
            </span>
          )}
        </div>
      </div>
      {canManage && showEditor && disallowed && (
        <BlacklistEditor
          type={disallowed}
          loadDisallowed={loadDisallowed}
          onAdd={(phone) => onSave("CONTACT_BLACKLIST", [{ action: "add", phone }])}
          onRemove={(phone) => onSave("CONTACT_BLACKLIST", [{ action: "remove", phone }])}
        />
      )}
    </div>
  );
}

function BlacklistEditor({
  type, loadDisallowed, onAdd, onRemove,
}: {
  type: WaDisallowedType;
  loadDisallowed: (t: WaDisallowedType) => Promise<string[]>;
  onAdd: (phone: string) => Promise<boolean>;
  onRemove: (phone: string) => Promise<boolean>;
}) {
  const [phones, setPhones] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    loadDisallowed(type).then((list) => { if (on) setPhones(list); }).catch(() => {});
    return () => { on = false; };
  }, [type, loadDisallowed]);

  async function add() {
    const phone = input.replace(/\D/g, "");
    if (phone.length < 8) return;
    setBusy(true);
    const ok = await onAdd(phone);
    if (ok) { setPhones((p) => [...new Set([...p, phone])]); setInput(""); }
    setBusy(false);
  }
  async function remove(phone: string) {
    setBusy(true);
    const ok = await onRemove(phone);
    if (ok) setPhones((p) => p.filter((x) => x !== phone));
    setBusy(false);
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-2.5">
      <p className="text-xs text-muted-foreground">Contatos que <strong>não</strong> verão esta informação:</p>
      {phones.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {phones.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 text-xs ring-1 ring-inset ring-border">
              {p}
              <button onClick={() => remove(p)} disabled={busy} aria-label={`Remover ${p}`} className="text-muted-foreground hover:text-destructive">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="5511999990000"
          inputMode="numeric"
          className="h-8 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={add}
          disabled={busy || input.replace(/\D/g, "").length < 8}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={12} />
          Bloquear
        </button>
      </div>
    </div>
  );
}
