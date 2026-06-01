import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { qk, type Action } from "@/lib/cx/queries";
import { toast } from "sonner";

export function CompleteActionDialog({
  action,
  open,
  onOpenChange,
  onCompleted,
}: {
  action: Action;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCompleted: (actionId: string) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      const completed_at = new Date(date + "T12:00:00Z").toISOString();
      const newNotes = note ? `${action.notes ? action.notes + "\n" : ""}[Conclusão] ${note}` : action.notes;
      const { error } = await supabase.from("actions").update({ completed_at, notes: newNotes }).eq("id", action.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ação concluída");
      qc.invalidateQueries({ queryKey: qk.actions });
      onOpenChange(false);
      onCompleted(action.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Marcar como concluída</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Data de conclusão</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Observação</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Resumo do que foi feito" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={m.isPending} onClick={() => m.mutate()} className="bg-success text-success-foreground hover:bg-success/90">Confirmar conclusão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
