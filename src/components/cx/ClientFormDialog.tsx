import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { qk, type Client } from "@/lib/cx/queries";

export function ClientFormDialog({
  trigger,
  client,
}: {
  trigger: React.ReactNode;
  client?: Client;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(client?.name ?? "");
  const [segment, setSegment] = useState(client?.segment ?? "");
  const [birthday, setBirthday] = useState(client?.birthday_date ?? "");
  const [status, setStatus] = useState(client?.status ?? "ativo");
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: async () => {
      const payload = { name, segment: segment || null, birthday_date: birthday || null, status };
      if (client) {
        const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(client ? "Cliente atualizado" : "Cliente criado");
      qc.invalidateQueries({ queryKey: qk.clients });
      setOpen(false);
      if (!client) { setName(""); setSegment(""); setBirthday(""); }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{client ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Segmento</Label><Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Ex: Aeroporto" /></div>
          <div><Label>Data de aniversário</Label><Input type="date" value={birthday ?? ""} onChange={(e) => setBirthday(e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!name || m.isPending} onClick={() => m.mutate()} className="bg-accent text-accent-foreground hover:bg-accent/90">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
