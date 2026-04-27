import Link from "next/link";
import { Building2, LogOut } from "lucide-react";
import { signOut } from "@/app/(dashboard)/actions";

export default function NoWorkspacePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl shadow-black/[0.06] p-8 flex flex-col items-center gap-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Building2 size={26} className="text-muted-foreground" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Nenhuma empresa ativa
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Você não possui empresa ativa no momento. Entre em contato com o administrador da sua empresa ou aguarde a reativação.
          </p>
        </div>

        <form action={signOut} className="w-full">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
          >
            <LogOut size={15} />
            Sair da conta
          </button>
        </form>

        <p className="text-xs text-muted-foreground">
          Precisa de ajuda?{" "}
          <Link href="mailto:suporte@crmvendas.com.br" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Fale com o suporte
          </Link>
        </p>
      </div>
    </div>
  );
}
