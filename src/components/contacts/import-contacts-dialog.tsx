"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, Download, X } from "lucide-react";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Button } from "@/components/ui/button";
import { appleEase } from "@/components/ui/motion";
import { ImportResultSummary } from "@/components/contacts/import-result-summary";
import type { useContactImportViewModel } from "@/viewmodels/useContactImportViewModel";

const TEMPLATE_HREF = "/templates/contacts-import-template.csv";
const ACCEPTED_TYPES = ".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

interface ImportContactsDialogProps {
  vm: ReturnType<typeof useContactImportViewModel>;
}

export function ImportContactsDialog({ vm }: ImportContactsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <AnimatePresence>
      {vm.open && (
        <>
          <ModalOverlay onClick={vm.closeDialog} />
          <motion.div
            key="import-contacts-modal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: appleEase }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/20 max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <h2 className="text-base font-semibold">Importar contatos por planilha</h2>
              <button
                onClick={vm.closeDialog}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {vm.stage === "upload" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Envie um arquivo <span className="font-medium text-foreground">.xlsx</span>,{" "}
                    <span className="font-medium text-foreground">.xls</span> ou{" "}
                    <span className="font-medium text-foreground">.csv</span>. As colunas{" "}
                    <span className="font-medium text-foreground">nome</span> e{" "}
                    <span className="font-medium text-foreground">celular</span> são obrigatórias — e-mail,
                    documento, empresa, status, origem e observações são reconhecidos automaticamente pelo
                    cabeçalho (ex: &quot;origem&quot;, &quot;canal&quot;).
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
                      onClick={vm.submit}
                      disabled={!vm.file || vm.isSubmitting}
                      className="rounded-xl min-w-[120px]"
                    >
                      {vm.isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Importando...
                        </span>
                      ) : (
                        "Importar"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {vm.stage === "result" && vm.result && (
                <>
                  <ImportResultSummary result={vm.result} />
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
  );
}
