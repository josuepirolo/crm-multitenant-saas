import Link from "next/link";
import { XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

async function hasRecoverySession(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;
    const payload = JSON.parse(atob(session.access_token.split(".")[1]));
    return Array.isArray(payload.amr) && payload.amr.some((a: { method: string }) => a.method === "recovery");
  } catch {
    return false;
  }
}

export default async function UpdatePasswordPage() {
  const isRecovery = await hasRecoverySession();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {isRecovery ? (
        <UpdatePasswordForm />
      ) : (
        <div className="relative w-full max-w-[400px]">
          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl shadow-black/[0.06] p-8 flex flex-col items-center gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <XCircle size={26} className="text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Link inválido ou expirado</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                O link de redefinição de senha é inválido ou já expirou. Solicite um novo link para continuar.
              </p>
            </div>
            <Link
              href="/reset-password"
              className="w-full inline-flex items-center justify-center h-11 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
            >
              Solicitar novo link
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
