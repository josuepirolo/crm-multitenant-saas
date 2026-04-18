import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-muted px-4 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
          <MessageSquare size={28} className="text-white" />
        </div>

        <div className="space-y-2">
          <p className="text-7xl font-bold tracking-tight text-foreground">404</p>
          <h1 className="text-xl font-semibold">Página não encontrada</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}
