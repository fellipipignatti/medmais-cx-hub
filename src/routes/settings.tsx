import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, qk } from "@/lib/cx/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ClientFormDialog } from "@/components/cx/ClientFormDialog";
import { UsersTab } from "@/components/cx/UsersTab";
import { useAuth } from "@/lib/cx/useAuth";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Configurações — MedMais CX Hub" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Cadastros básicos do sistema.</p>
      </div>
      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="managers">Gestores</TabsTrigger>
          <TabsTrigger value="types">Tipos de Ação</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Usuários</TabsTrigger>}
        </TabsList>
        <TabsContent value="clients" className="mt-4"><ClientsTab /></TabsContent>
        <TabsContent value="managers" className="mt-4"><ManagersTab /></TabsContent>
        <TabsContent value="types" className="mt-4"><TypesTab /></TabsContent>
        {isAdmin && <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>}
      </Tabs>
    </div>
  );
}

function ClientsTab() {
  const clients = useQuery({ queryKey: qk.clients, queryFn: api.listClients });
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("Excluir cliente?")) throw new Error("cancelled");
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: qk.clients }); },
    onError: (e: Error) => { if (e.message !== "cancelled") toast.error(e.message); },
  });
  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end">
        <ClientFormDialog trigger={<Button className="bg-accent text-accent-foreground hover:bg-accent/90">Novo cliente</Button>} />
      </div>
      <div className="space-y-2">
        {(clients.data ?? []).map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="flex-1">
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.segment} · {c.birthday_date ?? "sem data"} · {c.status}</div>
            </div>
            <ClientFormDialog client={c} trigger={<Button variant="outline" size="sm">Editar</Button>} />
            <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ManagersTab() {
  const managers = useQuery({ queryKey: qk.managers, queryFn: api.listManagers });
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [role, setRole] = useState(""); const [email, setEmail] = useState("");
  const add = useMutation({
    mutationFn: async () => {
      if (!name) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("managers").insert({ name, role: role || null, email: email || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Gestor cadastrado"); qc.invalidateQueries({ queryKey: qk.managers }); setName(""); setRole(""); setEmail(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("Excluir gestor?")) throw new Error("cancelled");
      const { error } = await supabase.from("managers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: qk.managers }); },
    onError: (e: Error) => { if (e.message !== "cancelled") toast.error(e.message); },
  });
  return (
    <Card className="p-4">
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Cargo</Label><Input value={role} onChange={(e) => setRole(e.target.value)} /></div>
        <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="flex items-end"><Button onClick={() => add.mutate()} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Adicionar</Button></div>
      </div>
      <div className="space-y-2">
        {(managers.data ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="flex-1">
              <div className="font-semibold">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.role} · {m.email}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TypesTab() {
  const types = useQuery({ queryKey: qk.actionTypes, queryFn: api.listActionTypes });
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [icon, setIcon] = useState("✅"); const [rec, setRec] = useState("unica"); const [desc, setDesc] = useState("");
  const add = useMutation({
    mutationFn: async () => {
      if (!name) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("action_types").insert({ name, icon, recurrence: rec, description: desc || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tipo cadastrado"); qc.invalidateQueries({ queryKey: qk.actionTypes }); setName(""); setDesc(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("Excluir tipo?")) throw new Error("cancelled");
      const { error } = await supabase.from("action_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: qk.actionTypes }); },
    onError: (e: Error) => { if (e.message !== "cancelled") toast.error(e.message); },
  });
  return (
    <Card className="p-4">
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <div><Label>Ícone</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2} /></div>
        <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Descrição</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div><Label>Recorrência</Label>
          <Select value={rec} onValueChange={setRec}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unica">Única</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end"><Button onClick={() => add.mutate()} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Adicionar</Button></div>
      </div>
      <div className="space-y-2">
        {(types.data ?? []).map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="text-2xl">{t.icon}</div>
            <div className="flex-1">
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.description} · {t.recurrence}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
