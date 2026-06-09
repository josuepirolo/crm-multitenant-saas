import type { ContactsByStateResult } from "@/repositories/dashboard.repository";

interface ContactsByStateCardProps {
  data: ContactsByStateResult;
}

export function ContactsByStateCard({ data }: ContactsByStateCardProps) {
  const { byState, withoutPhone } = data;
  const max = byState[0]?.count ?? 1;

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Contatos por Estado</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Top {byState.length} estados · distribuição por DDD
        </p>
      </div>

      {byState.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Nenhum contato com telefone ainda</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 flex-1">
            {byState.map(({ state, count }, i) => (
              <div key={state} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 text-right tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate">{state}</span>
                    <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                      {count.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.round((count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {withoutPhone > 0 && (
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
              {withoutPhone.toLocaleString("pt-BR")} contato{withoutPhone !== 1 ? "s" : ""} sem telefone cadastrado
            </p>
          )}
        </>
      )}
    </div>
  );
}
