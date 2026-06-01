import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type UserProfile } from "@/lib/cx/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, ShieldCheck, RotateCcw, Ban } from "lucide-react";

const qk = ["user_profiles_all"] as const;

async function listProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

export function UsersTab() {
  const { isAdmin, profile: me } = useAuth();
  const qc = useQueryClient();
  const all = useQuery({ queryKey: qk, queryFn: listProfiles, enabled: isAdmin });

  const mut = useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<UserProfile> }) => {
      const patch: Partial<UserProfile> = { ...vars.patch };
      if (patch.status === "approved") {
        patch.approved_by = me?.id ?? null;
        patch.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("user_profiles").update(patch).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success("Ação salva com sucesso!");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) {
    return <Card className="p-6 text-sm text-muted-foreground">Apenas administradores podem gerenciar usuários.</Card>;
  }
  if (all.isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const users = all.data ?? [];
  const pending = users.filter((u) => u.status === "pending");
  const approved = users.filter((u) => u.status === "approved");
  const rejected = users.filter((u) => u.status === "rejected");

  return (
    <div className="space-y-6">
      <Section title="Solicitações Pendentes" count={pending.length}>
        {pending.length === 0 ? (
          <Empty>Nenhuma solicitação aguardando.</Empty>
        ) : (
          pending.map((u) => (
            <Row key={u.id} user={u}>
              <Button size="sm" onClick={() => mut.mutate({ id: u.id, patch: { status: "approved" } })}>
                <Check className="mr-1 h-4 w-4" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: u.id, patch: { status: "rejected" } })}>
                <X className="mr-1 h-4 w-4" /> Rejeitar
              </Button>
            </Row>
          ))
        )}
      </Section>

      <Section title="Usuários Ativos" count={approved.length}>
        {approved.length === 0 ? (
          <Empty>Nenhum usuário ativo.</Empty>
        ) : (
          approved.map((u) => (
            <Row key={u.id} user={u}>
              {u.role !== "admin" && (
                <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: u.id, patch: { role: "admin" } })}>
                  <ShieldCheck className="mr-1 h-4 w-4" /> Tornar admin
                </Button>
              )}
              {u.id !== me?.id && (
                <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: u.id, patch: { status: "rejected" } })}>
                  <Ban className="mr-1 h-4 w-4" /> Revogar acesso
                </Button>
              )}
            </Row>
          ))
        )}
      </Section>

      <Section title="Acessos Rejeitados" count={rejected.length}>
        {rejected.length === 0 ? (
          <Empty>Nenhum acesso rejeitado.</Empty>
        ) : (
          rejected.map((u) => (
            <Row key={u.id} user={u}>
              <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: u.id, patch: { status: "pending" } })}>
                <RotateCcw className="mr-1 h-4 w-4" /> Reativar
              </Button>
            </Row>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">
        {title} <span className="text-muted-foreground">({count})</span>
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <Card className="p-4 text-sm text-muted-foreground">{children}</Card>;
}

function Row({ user, children }: { user: UserProfile; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{user.full_name}</span>
          {user.role === "admin" && <Badge variant="secondary">Admin</Badge>}
        </div>
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        <div className="text-[11px] text-muted-foreground">
          Cadastro: {new Date(user.created_at).toLocaleDateString("pt-BR")}
          {user.approved_at ? ` • Aprovado em ${new Date(user.approved_at).toLocaleDateString("pt-BR")}` : ""}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </Card>
  );
}
