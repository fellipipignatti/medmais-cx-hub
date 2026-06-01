import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, qk, statusOf } from "@/lib/cx/queries";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/cx/StatusBadge";
import { ActionFormDialog } from "@/components/cx/ActionFormDialog";
import { EvidencesDialog } from "@/components/cx/EvidencesDialog";

export const Route = createFileRoute("/actions")({
  head: () => ({ meta: [{ title: "Ações — MedMais CX Hub" }] }),
  component: ActionsPage,
});

function ActionsPage() {
  const actions = useQuery({ queryKey: qk.actions, queryFn: api.listActions });
  const clients = useQuery({ queryKey: qk.clients, queryFn: api.listClients });
  const managers = useQuery({ queryKey: qk.managers, queryFn: api.listManagers });
  const types = useQuery({ queryKey: qk.actionTypes, queryFn: api.listActionTypes });

  const evidencesCounts = useQuery({
    queryKey: ["evidences-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("evidences").select("action_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((e: { action_id: string }) => { map[e.action_id] = (map[e.action_id] ?? 0) + 1; });
      return map;
    },
  });

  const [clientF, setClientF] = useState("all");
  const [mF, setMF] = useState("all");
  const [tF, setTF] = useState("all");
  const [sF, setSF] = useState("all");
  const [evidenceFor, setEvidenceFor] = useState<string | null>(null);

  const rows = useMemo(() => {
    return (actions.data ?? [])
      .filter((a) => clientF === "all" || a.client_id === clientF)
      .filter((a) => mF === "all" || a.responsible_manager_id === mF)
      .filter((a) => tF === "all" || a.action_type_id === tF)
      .filter((a) => sF === "all" || statusOf(a) === sF);
  }, [actions.data, clientF, mF, tF, sF]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ações</h1>
          <p className="text-sm text-muted-foreground">Todas as ações da operação.</p>
        </div>
        <ActionFormDialog showClientPicker trigger={<Button className="bg-accent text-accent-foreground hover:bg-accent/90">Nova ação</Button>} />
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <Select value={clientF} onValueChange={setClientF}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clientes</SelectItem>
            {(clients.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mF} onValueChange={setMF}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos responsáveis</SelectItem>
            {(managers.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tF} onValueChange={setTF}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {(types.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sF} onValueChange={setSF}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="atrasada">Atrasada</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Data prevista</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const c = (clients.data ?? []).find((c) => c.id === a.client_id);
                const t = (types.data ?? []).find((t) => t.id === a.action_type_id);
                const m = (managers.data ?? []).find((m) => m.id === a.responsible_manager_id);
                return (
                  <tr key={a.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3"><Link to="/clients/$id" params={{ id: a.client_id }} className="font-medium hover:underline">{c?.name}</Link></td>
                    <td className="px-4 py-3">{t?.icon} {t?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.due_date}</td>
                    <td className="px-4 py-3"><StatusBadge status={statusOf(a)} /></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" className="relative" onClick={() => setEvidenceFor(a.id)}>
                        Evidências
                        {(evidencesCounts.data?.[a.id] ?? 0) > 0 && (
                          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
                            {evidencesCounts.data?.[a.id]}
                          </span>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Nenhuma ação encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <EvidencesDialog actionId={evidenceFor} open={!!evidenceFor} onOpenChange={(o) => !o && setEvidenceFor(null)} />
    </div>
  );
}
