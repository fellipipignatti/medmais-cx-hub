import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Cake, Edit, Plus, Trash2, Paperclip, CheckCircle2 } from "lucide-react";
import { api, qk, statusOf, type Action } from "@/lib/cx/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StatusBadge } from "@/components/cx/StatusBadge";
import { ClientFormDialog } from "@/components/cx/ClientFormDialog";
import { ActionFormDialog } from "@/components/cx/ActionFormDialog";
import { EvidencesDialog } from "@/components/cx/EvidencesDialog";
import { CompleteActionDialog } from "@/components/cx/CompleteActionDialog";

export const Route = createFileRoute("/clients/$id")({
  component: ClientDetail,
});

function initials(name: string) { return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(); }

function ClientDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const client = useQuery({ queryKey: qk.client(id), queryFn: () => api.getClient(id) });
  const managers = useQuery({ queryKey: qk.managers, queryFn: api.listManagers });
  const types = useQuery({ queryKey: qk.actionTypes, queryFn: api.listActionTypes });
  const actions = useQuery({ queryKey: qk.actions, queryFn: api.listActions });
  const links = useQuery({ queryKey: qk.clientManagers, queryFn: api.listClientManagers });
  const evidencesAll = useQuery({
    queryKey: ["evidences-by-client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("evidences").select("*, action:actions!inner(client_id)").eq("action.client_id", id);
      if (error) throw error;
      return data as Array<{ id: string; action_id: string; file_name: string | null; uploaded_at: string; uploaded_by: string | null; description: string | null }>;
    },
  });

  const [evidenceFor, setEvidenceFor] = useState<string | null>(null);
  const [completeFor, setCompleteFor] = useState<Action | null>(null);
  const [newManager, setNewManager] = useState("");
  const [newRel, setNewRel] = useState("gestor_contrato");

  const myActions = useMemo(() => (actions.data ?? []).filter((a) => a.client_id === id), [actions.data, id]);
  const myLinks = useMemo(() => (links.data ?? []).filter((l) => l.client_id === id), [links.data, id]);
  const evidenceCounts = useMemo(() => {
    const map: Record<string, number> = {};
    (evidencesAll.data ?? []).forEach((e) => { map[e.action_id] = (map[e.action_id] ?? 0) + 1; });
    return map;
  }, [evidencesAll.data]);

  const linkManager = useMutation({
    mutationFn: async () => {
      if (!newManager) throw new Error("Selecione um gestor");
      const { error } = await supabase.from("client_managers").insert({ client_id: id, manager_id: newManager, relationship_type: newRel });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Gestor vinculado"); qc.invalidateQueries({ queryKey: qk.clientManagers }); setNewManager(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlinkManager = useMutation({
    mutationFn: async (linkId: string) => {
      if (!confirm("Remover vínculo?")) throw new Error("cancelled");
      const { error } = await supabase.from("client_managers").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: qk.clientManagers }); },
    onError: (e: Error) => { if (e.message !== "cancelled") toast.error(e.message); },
  });

  const deleteAction = useMutation({
    mutationFn: async (aid: string) => {
      if (!confirm("Excluir esta ação? As evidências também serão removidas.")) throw new Error("cancelled");
      const { error } = await supabase.from("actions").delete().eq("id", aid);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ação excluída"); qc.invalidateQueries({ queryKey: qk.actions }); },
    onError: (e: Error) => { if (e.message !== "cancelled") toast.error(e.message); },
  });

  const deleteClient = useMutation({
    mutationFn: async () => {
      if (!confirm("Excluir cliente e todas as ações vinculadas?")) throw new Error("cancelled");
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cliente excluído"); nav({ to: "/" }); },
    onError: (e: Error) => { if (e.message !== "cancelled") toast.error(e.message); },
  });

  if (!client.data) return <div className="text-muted-foreground">Carregando…</div>;
  const c = client.data;

  const renderActions = (filter: (a: Action) => boolean) => {
    const list = myActions.filter(filter);
    if (list.length === 0) return <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma ação aqui.</div>;
    return (
      <div className="space-y-2">
        {list.map((a) => {
          const t = (types.data ?? []).find((t) => t.id === a.action_type_id);
          const m = (managers.data ?? []).find((m) => m.id === a.responsible_manager_id);
          const s = statusOf(a);
          return (
            <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="text-2xl">{t?.icon}</div>
              <div className="min-w-[180px] flex-1">
                <div className="font-semibold">{t?.name}</div>
                <div className="text-xs text-muted-foreground">{m?.name ?? "—"} · {a.due_date}</div>
                {a.notes && <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{a.notes}</div>}
              </div>
              <StatusBadge status={s} />
              <Badge variant="outline" className="gap-1"><Paperclip className="h-3 w-3" />{evidenceCounts[a.id] ?? 0}</Badge>
              <Button size="sm" variant="outline" onClick={() => setEvidenceFor(a.id)}>Evidências</Button>
              {s !== "concluida" && (
                <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => setCompleteFor(a)}>
                  <CheckCircle2 className="mr-1 h-3 w-3" />Concluir
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => deleteAction.mutate(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{c.name}</h1>
              <Badge variant={c.status === "ativo" ? "default" : "secondary"} className={c.status === "ativo" ? "bg-success text-success-foreground" : ""}>{c.status}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span><Badge variant="secondary">{c.segment ?? "—"}</Badge></span>
              {c.birthday_date && <span className="inline-flex items-center gap-1"><Cake className="h-4 w-4" /> {new Date(c.birthday_date).toLocaleDateString("pt-BR")}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <ClientFormDialog client={c} trigger={<Button variant="outline"><Edit className="mr-1 h-4 w-4" />Editar</Button>} />
            <Button variant="ghost" className="text-destructive" onClick={() => deleteClient.mutate()}><Trash2 className="mr-1 h-4 w-4" />Excluir</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-lg font-semibold">Gestores vinculados</h2>
        <div className="space-y-2">
          {myLinks.map((l) => {
            const m = (managers.data ?? []).find((m) => m.id === l.manager_id);
            if (!m) return null;
            return (
              <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary text-primary-foreground">{initials(m.name)}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.role}</div>
                </div>
                <Badge variant="outline">{l.relationship_type === "gestor_contrato" ? "Gestor de Contrato" : "Gestor de Ação"}</Badge>
                <Button size="icon" variant="ghost" onClick={() => unlinkManager.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Select value={newManager} onValueChange={setNewManager}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Selecione gestor" /></SelectTrigger>
            <SelectContent>
              {(managers.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={newRel} onValueChange={setNewRel}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gestor_contrato">Gestor de Contrato</SelectItem>
              <SelectItem value="gestor_acao">Gestor de Ação</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => linkManager.mutate()} className="bg-primary text-primary-foreground"><Plus className="mr-1 h-4 w-4" />Vincular</Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ações</h2>
          <ActionFormDialog clientId={id} trigger={<Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="mr-1 h-4 w-4" />Nova ação</Button>} />
        </div>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="done">Concluídas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">{renderActions((a) => statusOf(a) !== "concluida")}</TabsContent>
          <TabsContent value="done" className="mt-4">{renderActions((a) => statusOf(a) === "concluida")}</TabsContent>
          <TabsContent value="all" className="mt-4">{renderActions(() => true)}</TabsContent>
        </Tabs>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
        <div className="relative space-y-4 border-l-2 border-border pl-5">
          {[...myActions]
            .flatMap((a) => {
              const t = (types.data ?? []).find((t) => t.id === a.action_type_id);
              const m = (managers.data ?? []).find((m) => m.id === a.responsible_manager_id);
              const entries = [{ date: a.created_at, text: `${m?.name ?? "Sistema"} criou a ação ${t?.icon ?? ""} ${t?.name ?? ""}` }];
              if (a.completed_at) entries.push({ date: a.completed_at, text: `${m?.name ?? "Sistema"} concluiu ${t?.name ?? ""}` });
              return entries;
            })
            .concat((evidencesAll.data ?? []).map((e) => {
              const m = (managers.data ?? []).find((m) => m.id === e.uploaded_by);
              return { date: e.uploaded_at, text: `${m?.name ?? "—"} anexou evidência: ${e.file_name}` };
            }))
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e, i) => (
              <div key={i} className="relative">
                <span className="absolute -left-[26px] top-1.5 h-3 w-3 rounded-full bg-accent ring-4 ring-background" />
                <div className="text-xs text-muted-foreground">{new Date(e.date).toLocaleString("pt-BR")}</div>
                <div className="text-sm">{e.text}</div>
              </div>
            ))}
        </div>
      </Card>

      <EvidencesDialog actionId={evidenceFor} open={!!evidenceFor} onOpenChange={(o) => !o && setEvidenceFor(null)} />
      {completeFor && (
        <CompleteActionDialog
          action={completeFor}
          open={!!completeFor}
          onOpenChange={(o) => !o && setCompleteFor(null)}
          onCompleted={(aid) => setEvidenceFor(aid)}
        />
      )}
    </div>
  );
}
