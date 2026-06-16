"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { appleEase } from "@/components/ui/motion";
import { can } from "@/lib/permissions";
import { useSettingsIntegrationsViewModel } from "@/viewmodels/useSettingsIntegrationsViewModel";
import { WaInstanceCard } from "./wa-instance-card";
import { QrCodeDialog } from "./qr-code-dialog";
import { WaAccountDialog } from "./wa-account-dialog";
import type { MemberRole, WaInstanceWithTenant } from "@/types";

function IntegrationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function IntegrationsTab({ userRole }: { userRole: MemberRole | null }) {
  const vm = useSettingsIntegrationsViewModel();
  const [qrInstance, setQrInstance] = useState<WaInstanceWithTenant | null>(null);
  const [accountInstance, setAccountInstance] = useState<WaInstanceWithTenant | null>(null);

  const canManage = can(userRole, "settings", "edit");

  if (vm.loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <Header />
        <div className="mt-5">
          <IntegrationsSkeleton />
        </div>
      </div>
    );
  }

  if (vm.error) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <Header />
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{vm.error}</p>
          <button
            onClick={vm.reload}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-destructive transition-colors hover:text-destructive/80"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <Header onReload={vm.reload} />

      {vm.instances.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <MessageCircle size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Nenhum WhatsApp conectado</p>
            <p className="mx-auto max-w-xs text-xs text-muted-foreground">
              A conexão de uma instância WhatsApp é habilitada pela nossa equipe.
              Fale com o suporte para ativar a integração do seu workspace.
            </p>
          </div>
        </div>
      ) : (
        <motion.div
          className="mt-5 space-y-3"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          {vm.instances.map((inst) => (
            <motion.div
              key={inst.instance_id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: appleEase } },
              }}
            >
              <WaInstanceCard
                instance={inst}
                liveStatus={vm.statuses[inst.instance_id]}
                canManage={canManage}
                onConnect={setQrInstance}
                onRestart={vm.restart}
                onDisconnect={vm.disconnect}
                onOpenAccount={setAccountInstance}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {qrInstance && (
        <QrCodeDialog
          instance={qrInstance}
          fetchQrCode={vm.fetchQrCode}
          fetchStatus={vm.fetchStatus}
          onClose={() => setQrInstance(null)}
          onConnected={() => vm.refreshStatus(qrInstance)}
        />
      )}

      {accountInstance && (
        <WaAccountDialog
          instance={accountInstance}
          canManage={canManage}
          onClose={() => setAccountInstance(null)}
        />
      )}
    </div>
  );
}

function Header({ onReload }: { onReload?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold">Integrações WhatsApp</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Conexão e status dos números WhatsApp do seu workspace
        </p>
      </div>
      {onReload && (
        <button
          onClick={onReload}
          aria-label="Atualizar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw size={15} />
        </button>
      )}
    </div>
  );
}
