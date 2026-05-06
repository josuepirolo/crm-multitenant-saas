"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Briefcase, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setNicheOnboarding } from "@/app/(dashboard)/setup-niche-action";
import { appleEase } from "@/components/ui/motion";
import type { BusinessNiche } from "@/types";

interface Props {
  niches: BusinessNiche[];
}

export function NicheSetupWall({ niches }: Props) {
  const [selectedNiche, setSelectedNiche] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const parents = niches.filter((n) => !n.parent_id);

  function handleSubmit() {
    if (!selectedNiche) return;
    startTransition(async () => {
      const promise = setNicheOnboarding(selectedNiche);
      toast.promise(promise, {
        loading: "Salvando segmento...",
        success: () => {
          router.refresh();
          return "Pronto! Seu CRM foi personalizado.";
        },
        error: (err) => err?.error ?? "Erro ao salvar. Tente novamente.",
      });
    });
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted px-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: appleEase }}
        className="relative w-full max-w-[420px] rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl shadow-black/[0.06] p-8"
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <Briefcase size={26} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Qual é o segmento da sua empresa?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Isso personaliza o CRM para o seu tipo de negócio — você verá só o que é relevante para você.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Select value={selectedNiche} onValueChange={(v) => setSelectedNiche(v ?? "")}>
            <SelectTrigger className="h-12 rounded-xl border-border/60 bg-background text-foreground text-sm focus:ring-primary/30 transition-all duration-200">
              <SelectValue>
                {selectedNiche
                  ? niches.find((n) => n.id === selectedNiche)?.name
                  : <span className="text-muted-foreground">Selecione o segmento da empresa...</span>}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {parents.map((parent) => {
                const children = niches.filter((n) => n.parent_id === parent.id);
                if (children.length > 0) {
                  return (
                    <SelectGroup key={parent.id}>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground">
                        {parent.name}
                      </SelectLabel>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                }
                return (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button
            onClick={handleSubmit}
            disabled={!selectedNiche || isPending}
            className="w-full h-11 text-sm font-medium rounded-xl transition-all duration-200 gap-2"
          >
            {isPending ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Continuar
                <ChevronRight size={16} />
              </>
            )}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          Você pode alterar isso depois em Configurações → Empresa
        </p>
      </motion.div>
    </div>
  );
}
