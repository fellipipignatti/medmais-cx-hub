import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Calendar, AlertCircle, CheckCircle2, Search, ArrowRight, Cake } from "lucide-react";
import { api, qk, statusOf, clientStatusOf, daysUntilBirthday, type ClientStatus } from "@/lib/cx/queries";
import { ClientStatusBadge } from "@/components/cx/ClientStatusBadge";
import { ClientFormDialog } from "@/components/cx/ClientFormDialog";
import { ActionFormDialog } from "@/components/cx/ActionFormDialog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — MedMais CX Hub" }] }),
  component: Dashboard,
});

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Dashboard() {
  const clients = useQuery({ queryKey: qk.clients, queryFn: api.listClients });
  const managers = useQuery({ queryKey: qk.managers, queryFn: api.listManagers });
  const actions = useQuery({ queryKey: qk.actions, queryFn: api.listActions });
  const links = useQuery({ queryKey: qk.clientManagers, queryFn: api.listClientManagers });
  const types = useQuery({ queryKey: qk.actionTypes, queryFn: api.listActionTypes });

  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<string>("all");
  const [manager, setManager] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const stats = useMemo(() => {
    const acts = actions.data ?? [];
    return {
      activeClients: (clients.data ?? []).filter((c) => c.status === "ativo").length,
      pendingToday: acts.filter((a) => statusOf(a) === "pendente" && a.due_date === today).length,
      overdue: acts.filter((a) => statusOf(a) === "atrasada").length,
      doneWeek: acts.filter((a) => a.completed_at && a.completed_at >= weekAgo).length,
    };
  }, [actions.data, clients.data, today, weekAgo]);

  const segments = useMemo(
    () => Array.from(new Set((clients.data ?? []).map((c) => c.segment).filter(Boolean) as string[])),
    [clients.data],
  );

  const BIRTHDAY_TYPE_ID = useMemo(
    () => (types.data ?? []).find((t) => t.name.toLowerCase().includes("aniver"))?.id ?? null,
    [types.data],
  );

  const rows = useMemo(() => {
    const acts = actions.data ?? [];
    const ls = links.data ?? [];
    const ms = managers.data ?? [];
    const ts = types.data ?? [];
    return (clients.data ?? [])
      .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true))
      .filter((c) => (segment === "all" ? true : c.segment === segment))
      .map((c) => {
        const myManagers = ls.filter((l) => l.client_id === c.id).map((l) => ms.find((m) => m.id === l.manager_id)!).filter(Boolean);
        const myActions = acts.filter((a) => a.client_id === c.id);
        const pending = myActions.filter((a) => statusOf(a) !== "concluida");
        const next = pending.sort((a, b) => (a.due_date ?? "z").localeCompare(b.due_date ?? "z"))[0];
        const nextType = next ? ts.find((t) => t.id === next.action_type_id) : null;
        const cStatus: ClientStatus = clientStatusOf(myActions);
        const days = daysUntilBirthday(c.birthday_date);
        const nextIsBirthday = !!next && next.action_type_id === BIRTHDAY_TYPE_ID && days !== null && days <= 7;
        return { c, myManagers, pending: pending.length, next, nextType, cStatus, days, nextIsBirthday };
      })
      .filter((r) => (manager === "all" ? true : r.myManagers.some((m) => m.id === manager)))
      .filter((r) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "pending") return r.cStatus === "pendente";
        if (statusFilter === "ok") return r.cStatus === "em_dia";
        if (statusFilter === "overdue") return r.cStatus === "atrasada";
        return true;
      });
  }, [clients.data, actions.data, links.data, managers.data, types.data, q, segment, manager, statusFilter, BIRTHDAY_TYPE_ID]);

  const birthdayAlerts = useMemo(() => {
    const acts = actions.data ?? [];
    if (!BIRTHDAY_TYPE_ID) return [];
    return (clients.data ?? [])
      .map((c) => ({ c, days: daysUntilBirthday(c.birthday_date) }))
      .filter((x) => x.days !== null && x.days <= 7 && x.days >= 0)
      .filter(({ c }) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const thisYear = today.getFullYear();
        // procura ação de aniversário neste ano para esse cliente
        return !acts.some((a) =>
          a.client_id === c.id &&
          a.action_type_id === BIRTHDAY_TYPE_ID &&
          ((a.due_date && a.due_date.startsWith(String(thisYear))) ||
           (a.completed_at && a.completed_at.startsWith(String(thisYear))))
        );
      });
  }, [clients.data, actions.data, BIRTHDAY_TYPE_ID]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel principal</h1>
          <p className="text-sm text-muted-foreground">Acompanhe a saúde da carteira de clientes em tempo real.</p>
        </div>
        <ClientFormDialog trigger={<Button className="bg-accent text-accent-foreground hover:bg-accent/90">Novo Cliente</Button>} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Clientes ativos" value={stats.activeClients} tone="primary" />
        <StatCard icon={<Calendar className="h-5 w-5" />} label="Pendentes hoje" value={stats.pendingToday} tone="warning" />
        <StatCard icon={<AlertCircle className="h-5 w-5" />} label="Atrasadas" value={stats.overdue} tone="destructive" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Concluídas (7 dias)" value={stats.doneWeek} tone="success" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar cliente..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos segmentos</SelectItem>
              {segments.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={manager} onValueChange={setManager}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Gestor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos gestores</SelectItem>
              {(managers.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Com pendências</SelectItem>
              <SelectItem value="overdue">Com atrasos</SelectItem>
              <SelectItem value="ok">Em dia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {birthdayAlerts.length > 0 && (
        <Card className="border-accent/40 bg-accent/5 p-4">
          <div className="space-y-2">
            {birthdayAlerts.map(({ c, days }) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Cake className="h-4 w-4 text-accent" />
                  <span>
                    <strong>{c.name}</strong> faz aniversário em <strong>{days} dia{days === 1 ? "" : "s"}</strong> e não tem ação de aniversário cadastrada.
                  </span>
                </div>
                <ActionFormDialog
                  clientId={c.id}
                  defaultActionTypeId={BIRTHDAY_TYPE_ID ?? undefined}
                  trigger={<Button size="sm" variant="outline" className="border-accent/40 text-accent hover:bg-accent/10">+ Criar ação</Button>}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Segmento</th>
                <th className="px-4 py-3">Gestores</th>
                <th className="px-4 py-3">Pendentes</th>
                <th className="px-4 py-3">Próxima ação</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.c.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-semibold">{r.c.name}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{r.c.segment ?? "—"}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex -space-x-2">
                      {r.myManagers.slice(0, 4).map((m) => (
                        <Avatar key={m.id} className="h-7 w-7 border-2 border-card" title={m.name}>
                          <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">{initials(m.name)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={r.pending > 0 ? "border-accent/40 text-accent" : ""}>{r.pending}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.next ? (
                      <span className="inline-flex items-center gap-1">
                        {r.nextIsBirthday && <Cake className="h-4 w-4 text-accent" />}
                        {r.nextType?.icon} {r.nextType?.name} · {r.next.due_date}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3"><ClientStatusBadge status={r.cStatus} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/clients/$id" params={{ id: r.c.id }}>Ver detalhes <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "primary" | "warning" | "destructive" | "success" }) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-[oklch(0.5_0.15_75)]",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/15 text-[oklch(0.45_0.15_155)]",
  }[tone];
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`grid h-12 w-12 place-items-center rounded-xl ${toneCls}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}
