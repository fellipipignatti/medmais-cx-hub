import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { api, qk } from "@/lib/cx/queries";
import { toast } from "sonner";

export function ActionFormDialog({
  trigger,
  clientId,
  showClientPicker = false,
  defaultActionTypeId,
}: {
  trigger: React.ReactNode;
  clientId?: string;
  showClientPicker?: boolean;
  defaultActionTypeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(clientId ?? "");
  const [typeId, setTypeId] = useState(defaultActionTypeId ?? "");
  const [manager, setManager] = useState("");
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();

  const clients = useQuery({ queryKey: qk.clients, queryFn: api.listClients, enabled: showClientPicker });
  const types = useQuery({ queryKey: qk.actionTypes, queryFn: api.listActionTypes });
  const managers = useQuery({ queryKey: qk.managers, queryFn: api.listManagers });

  const m = useMutation({
    mutationFn: async () => {
      const cid = clientId ?? selectedClient;
      if (!cid || !typeId) throw new Error("Cliente e tipo são obrigatórios");
      const { error } = await supabase.from("actions").insert({
        client_id: cid,
        action_type_id: typeId,
        responsible_manager_id: manager || null,
        due_date: due || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ação criada");
      qc.invalidateQueries({ queryKey: qk.actions });
      setOpen(false);
      setTypeId(""); setManager(""); setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova ação</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {showClientPicker && (
            <div><Label>Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(clients.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Tipo de ação</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(types.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Responsável</Label>
            <Select value={manager} onValueChange={setManager}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(managers.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Data prevista</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={m.isPending} onClick={() => m.mutate()} className="bg-accent text-accent-foreground hover:bg-accent/90">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
