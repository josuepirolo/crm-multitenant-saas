"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, MessageSquare } from "lucide-react";
import { WaInstanceSelector } from "@/components/whatsapp/wa-instance-selector";
import { useWaEnviarViewModel } from "@/viewmodels/useWaEnviarViewModel";
import type { WaInstanceWithTenant, WaMessageType } from "@/types";

const MESSAGE_TYPES: { value: WaMessageType; label: string }[] = [
  { value: "text",     label: "Texto" },
  { value: "image",    label: "Imagem" },
  { value: "audio",    label: "Áudio" },
  { value: "video",    label: "Vídeo" },
  { value: "document", label: "Documento" },
];

interface WaEnviarFormProps {
  instances: WaInstanceWithTenant[];
}

export function WaEnviarForm({ instances }: WaEnviarFormProps) {
  const vm = useWaEnviarViewModel(instances);

  if (!instances.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card px-6 py-14 text-center">
        <MessageSquare size={28} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhuma integração WhatsApp configurada neste workspace.</p>
      </div>
    );
  }

  const isText = vm.form.type === "text";

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Instância */}
      <WaInstanceSelector
        instances={instances}
        selected={vm.selectedInstance}
        onSelect={vm.handleSelectInstance}
        disabled={vm.isSending}
      />
      {!vm.selectedInstance && instances.length > 1 && (
        <p className="text-sm text-muted-foreground -mt-2">Selecione uma instância para enviar.</p>
      )}

      {/* Destinatário */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to">
          Destinatário
          <span className="ml-1 text-xs text-muted-foreground">(E.164 sem + ou ID de grupo)</span>
        </Label>
        <Input
          id="to"
          placeholder="Ex: 5544999990000"
          value={vm.form.to}
          onChange={(e) => vm.handleFieldChange("to", e.target.value)}
          disabled={vm.isSending}
        />
      </div>

      {/* Tipo de mensagem */}
      <div className="flex flex-col gap-1.5">
        <Label>Tipo</Label>
        <Select
          value={vm.form.type}
          onValueChange={(v) => { if (v !== null) vm.handleFieldChange("type", v as WaMessageType); }}
          disabled={vm.isSending}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESSAGE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conteúdo */}
      {isText ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="text">Mensagem</Label>
          <textarea
            id="text"
            placeholder="Digite a mensagem…"
            value={vm.form.text}
            onChange={(e) => vm.handleFieldChange("text", e.target.value)}
            rows={5}
            maxLength={4096}
            disabled={vm.isSending}
            className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground text-right">{vm.form.text.length}/4096</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="media_url">URL da mídia</Label>
            <Input
              id="media_url"
              type="url"
              placeholder="https://…"
              value={vm.form.media_url}
              onChange={(e) => vm.handleFieldChange("media_url", e.target.value)}
              disabled={vm.isSending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="caption">Legenda <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              id="caption"
              placeholder="Descrição da mídia…"
              value={vm.form.caption}
              onChange={(e) => vm.handleFieldChange("caption", e.target.value)}
              disabled={vm.isSending}
            />
          </div>
        </div>
      )}

      {/* Enviado com sucesso */}
      {vm.lastSentId && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Última mensagem enviada — ID: <code className="font-mono">{vm.lastSentId}</code>
        </p>
      )}

      <Button
        onClick={vm.handleSend}
        disabled={vm.isSending || !vm.selectedInstance || !vm.form.to}
        className="w-fit"
      >
        <Send size={14} className="mr-1.5" />
        {vm.isSending ? "Enviando…" : "Enviar"}
      </Button>
    </div>
  );
}
