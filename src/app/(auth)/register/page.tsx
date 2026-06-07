import Link from "next/link";
import { MessageSquare, AlertCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { RegisterForm } from "@/components/auth/register-form";
import { SELF_REGISTRATION_ENABLED } from "@/lib/constants/feature-flags";
import type { BusinessNiche } from "@/types";

function RegistrationDisabled() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted px-4">
      <div className="relative w-full max-w-[400px]">
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl shadow-black/[0.06] p-8">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              <MessageSquare size={26} className="text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">CRM Vendas</h1>
              <p className="mt-1 text-sm text-muted-foreground">Entre na sua conta para continuar</p>
            </div>
          </div>

          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2.5 rounded-xl bg-warning/8 border border-warning/20 px-4 py-3"
          >
            <AlertCircle size={15} className="shrink-0 text-warning" />
            <p className="text-sm text-warning">
              O cadastro de novas contas está temporariamente indisponível. Tente novamente mais tarde.
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors duration-150">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function RegisterPage() {
  if (!SELF_REGISTRATION_ENABLED) {
    return <RegistrationDisabled />;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("business_niches")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  const niches: BusinessNiche[] = (data ?? []) as BusinessNiche[];

  return <RegisterForm niches={niches} />;
}
