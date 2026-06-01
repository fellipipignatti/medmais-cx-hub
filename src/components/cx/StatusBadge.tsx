import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map = {
  pendente: { label: "Pendente", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  concluida: { label: "Concluída", cls: "bg-success/15 text-[oklch(0.45_0.15_155)] border-success/40" },
  atrasada: { label: "Atrasada", cls: "bg-destructive/15 text-destructive border-destructive/40" },
} as const;

export function StatusBadge({ status }: { status: keyof typeof map }) {
  const s = map[status] ?? map.pendente;
  return (
    <Badge variant="outline" className={cn("font-medium", s.cls)}>
      {s.label}
    </Badge>
  );
}
