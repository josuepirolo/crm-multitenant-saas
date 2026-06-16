"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WaInstanceWithTenant } from "@/types";

interface WaInstanceSelectorProps {
  instances: WaInstanceWithTenant[];
  selected: WaInstanceWithTenant | null;
  onSelect: (instance: WaInstanceWithTenant) => void;
  disabled?: boolean;
}

export function WaInstanceSelector({ instances, selected, onSelect, disabled }: WaInstanceSelectorProps) {
  if (instances.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">Instância:</span>
      <Select
        value={selected?.instance_id ?? ""}
        onValueChange={(id) => {
          const inst = instances.find((i) => i.instance_id === id);
          if (inst) onSelect(inst);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-52 h-8 text-sm">
          <SelectValue placeholder="Selecionar instância…" />
        </SelectTrigger>
        <SelectContent>
          {instances.map((inst) => (
            <SelectItem key={inst.instance_id} value={inst.instance_id}>
              {inst.integration_label ?? inst.name}{" "}
              <span className={`text-xs ${inst.status === "connected" ? "text-green-600" : "text-muted-foreground"}`}>
                ({inst.status === "connected" ? "conectada" : "desconectada"})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
