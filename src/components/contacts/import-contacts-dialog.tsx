"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, Download, X, Minus, Plus, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appleEase } from "@/components/ui/motion";
import { ImportResultSummary } from "@/components/contacts/import-result-summary";
import type { useContactImportViewModel } from "@/viewmodels/useContactImportViewModel";

const TEMPLATE_HREF = "/templates/contacts-import-template.csv";
const ACCEPTED_TYPES = ".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

interface ImportContactsDialogProps {
  vm: ReturnType<typeof useContactImportViewModel>;
}

/** Mini-form para criar uma origem sem sair do fluxo de importação — disponível em qualquer etapa. */
function CreateSourceInline({ vm }: ImportContactsDialogProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Plus size={13} className="text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Criar nova origem</span>
      </div>
      <div className="flex gap-2">
        <Input
          value={vm.newSourceName}
          onChange={(e) => vm.setNewSourceName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") vm.createSourceAndSelect(); }}
          placeholder="Ex: Instagram, Indicação..."
          className="flex-1 h-9 text-sm rounded-lg"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={vm.createSourceAndSelect}
          disabled={vm.newSourceName.trim().length < 2 || vm.creatingSource}
          className="rounded-lg gap-1.5 shrink-0"
        >
          {vm.creatingSource ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
          ) : (
            <Plus size={13} />
          )}
          Criar
        </Button>
      </div>
    </div>
  );
}

export function ImportContactsDialog({ vm }: ImportContactsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
    <AnimatePresence>
      {vm.open && !vm.isCollapsed && (
        <>
          <ModalOverlay onClick={vm.tryClose} />
          <motion.div
            key="import-contacts-modal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: appleEase }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-2xl -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/20 max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <h2 className="text-base font-semibold">Importar contatos por planilha</h2>
              <div className="flex items-center gap-1">
                {vm.isSubmitting && (
                  <button
                    onClick={vm.collapse}
                    title="Minimizar — a importação continua em segundo plano"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Minus size={16} />
                  </button>
                )}
                <button
                  onClick={vm.tryClose}
                  disabled={vm.isSubmitting}
                  title={vm.isSubmitting ? "Importação em andamento" : "Fechar"}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {/* ── ETAPA 1: upload ───────────────────────────────────────── */}
              {vm.stage === "upload" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Envie um arquivo <span className="font-medium text-foreground">.xlsx</span> ou{" "}
                    <span className="font-medium text-foreground">.csv</span>. As colunas{" "}
                    <span className="font-medium text-foreground">nome</span> e{" "}
                    <span className="font-medium text-foreground">celular</span> são obrigatórias.
                  </p>

                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-8 text-center transition-colors hover:bg-muted/50"
                  >
                    <Upload size={22} className="text-muted-foreground" />
                    {vm.file ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <FileSpreadsheet size={15} />
                        {vm.file.name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Clique para selecionar o arquivo (máx. 5MB)</span>
                    )}
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    className="hidden"
                    onChange={(e) => vm.selectFile(e.target.files?.[0] ?? null)}
                  />

                  {vm.error && <p className="text-xs text-destructive">{vm.error}</p>}

                  <a
                    href={TEMPLATE_HREF}
                    download
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Download size={13} />
                    Baixar planilha de exemplo
                  </a>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={vm.closeDialog} className="rounded-xl">
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={vm.advance}
                      disabled={!vm.file || vm.isSubmitting}
                      className="rounded-xl min-w-[120px]"
                    >
                      {vm.isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Lendo arquivo...
                        </span>
                      ) : (
                        "Avançar"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* ── ETAPA 2: preview ──────────────────────────────────────── */}
              {vm.stage === "preview" && vm.previewData && (
                <>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={15} className="text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground truncate">
                      <span className="font-medium text-foreground">{vm.file?.name}</span>
                      {" — "}primeiras {vm.previewData.previewRows.length} linha{vm.previewData.previewRows.length !== 1 ? "s" : ""} identificadas
                    </p>
                  </div>

                  {/* Tabela de pré-visualização */}
                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full min-w-max text-xs">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/40">
                          {vm.previewData.headers.map((h, i) => (
                            <th
                              key={i}
                              className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
                            >
                              {h || `Coluna ${i + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {vm.previewData.previewRows.map((row, i) => (
                          <tr key={i} className="border-b border-border/30 last:border-0">
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className="max-w-[140px] truncate px-3 py-2 text-foreground"
                                title={cell}
                              >
                                {cell || <span className="text-muted-foreground/50">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Seleção de origem quando não há coluna — oculto durante o import */}
                  {!vm.isSubmitting && (
                    vm.previewData.hasOriginColumn ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3">
                        <CheckCircle2 size={15} className="text-primary shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          Coluna de origem detectada — os contatos serão importados com a origem da planilha.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20 p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                              Coluna de origem não encontrada
                            </p>
                            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                              Selecione uma origem existente abaixo, ou crie uma nova em &quot;Criar nova origem&quot;.
                            </p>
                          </div>
                        </div>

                        {/* Seletor de origem existente */}
                        <select
                          value={vm.selectedSourceId}
                          onChange={(e) => vm.setSelectedSourceId(e.target.value)}
                          className="h-9 w-full rounded-lg border border-amber-200/80 dark:border-amber-800/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all"
                        >
                          <option value="">Selecionar origem existente...</option>
                          {vm.sources.filter((s) => s.is_active).map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )
                  )}

                  {/* Criar nova origem — disponível durante todo o fluxo de importação */}
                  <CreateSourceInline vm={vm} />

                  {vm.error && <p className="text-xs text-destructive">{vm.error}</p>}

                  {/* Barra de progresso (aparece durante importação em lotes) */}
                  {vm.isSubmitting && (
                    <div className="space-y-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {vm.totalChunks > 1
                            ? `Importando lote ${vm.currentChunk} de ${vm.totalChunks}…`
                            : "Importando contatos…"}
                        </span>
                        {vm.totalChunks > 1 && (
                          <span className="tabular-nums font-medium text-foreground">
                            {vm.processedRows.toLocaleString("pt-BR")}
                            {" / "}
                            {vm.previewData.totalDataRows.toLocaleString("pt-BR")}
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: "0%" }}
                          animate={{
                            width: vm.totalChunks > 1
                              ? `${Math.round((vm.processedRows / Math.max(vm.previewData.totalDataRows, 1)) * 100)}%`
                              : "100%",
                          }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={vm.goBack}
                      disabled={vm.isSubmitting}
                      className="rounded-xl"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      onClick={vm.submit}
                      disabled={
                        (!vm.previewData.hasOriginColumn && !vm.selectedSourceId) ||
                        vm.isSubmitting
                      }
                      className="rounded-xl min-w-[160px]"
                    >
                      {vm.isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          {vm.totalChunks > 1 ? `Lote ${vm.currentChunk}/${vm.totalChunks}` : "Importando…"}
                        </span>
                      ) : (
                        "Confirmar e importar"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* ── ETAPA 3: resultado ────────────────────────────────────── */}
              {vm.stage === "result" && vm.result && (
                <>
                  <ImportResultSummary result={vm.result} />

                  {/* Criar nova origem — útil para a próxima importação ou ajustes manuais */}
                  <CreateSourceInline vm={vm} />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" onClick={vm.closeDialog} className="rounded-xl">
                      Concluir
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Pill flutuante quando colapsado */}
    <AnimatePresence>
      {vm.open && vm.isCollapsed && (
        <motion.div
          key="import-pill"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: appleEase }}
          className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/20 p-4"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              {vm.stage !== "result" ? (
                <Loader2 size={14} className="text-primary shrink-0 animate-spin" />
              ) : (
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              )}
              <span className="text-sm font-medium truncate">
                {vm.stage === "result" ? "Importação concluída" : "Importando contatos…"}
              </span>
            </div>
            <button
              onClick={vm.expand}
              className="text-xs text-primary hover:underline shrink-0"
            >
              Ver detalhes
            </button>
          </div>

          {vm.stage !== "result" ? (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {vm.totalChunks > 1
                  ? `Lote ${vm.currentChunk} de ${vm.totalChunks} · ${vm.processedRows.toLocaleString("pt-BR")} / ${(vm.previewData?.totalDataRows ?? 0).toLocaleString("pt-BR")} linhas`
                  : "Processando…"}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{
                    width: vm.totalChunks > 1
                      ? `${Math.round((vm.processedRows / Math.max(vm.previewData?.totalDataRows ?? 1, 1)) * 100)}%`
                      : "100%",
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </>
          ) : vm.result ? (
            <p className="text-xs text-muted-foreground">
              {vm.result.created.toLocaleString("pt-BR")} criado(s) · {vm.result.skipped.toLocaleString("pt-BR")} ignorado(s)
            </p>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
