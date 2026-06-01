import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/lib/cx/queries";

const map: Record<ClientStatus, { label: string; cls: string }> = {
  sem_acoes: { label: "Sem ações", cls: "bg-muted text-muted-foreground border-border" },
  em_dia: { label: "Em dia", cls: "bg-success/15 text-[oklch(0.45_0.15_155)] border-success/40" },
  pendente: { label: "Pendente", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  atrasada: { label: "Atrasada", cls: "bg-destructive/15 text-destructive border-destructive/40" },
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const s = map[status];
  return <Badge variant="outline" className={cn("font-medium", s.cls)}>{s.label}</Badge>;
}
