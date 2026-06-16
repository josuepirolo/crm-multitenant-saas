"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Link2, UsersRound, Send, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const SUB_NAV = [
  { href: "/whatsapp/conexao", label: "Conexão", icon: Link2 },
  { href: "/whatsapp/grupos", label: "Grupos", icon: UsersRound },
  { href: "/whatsapp/enviar", label: "Enviar mensagem", icon: Send },
  { href: "/whatsapp/campanhas", label: "Campanhas", icon: Megaphone },
] as const;

export function WhatsAppSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border/50 pb-px scrollbar-none"
      aria-label="WhatsApp"
    >
      {SUB_NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            <Icon size={16} className="shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
