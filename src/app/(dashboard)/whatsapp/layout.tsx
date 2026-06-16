import { WhatsAppSubNav } from "@/components/whatsapp/whatsapp-sub-nav";

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Conexão, grupos e envios do integrador do seu workspace
        </p>
      </div>
      <WhatsAppSubNav />
      {children}
    </div>
  );
}
