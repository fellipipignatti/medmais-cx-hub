import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { api, fileKind, qk } from "@/lib/cx/queries";
import { getEvidenceSignedUrl } from "@/lib/cx/evidenceUrl";
import { toast } from "sonner";
import { FileText, FileSpreadsheet, FileIcon, Download, Trash2, Upload } from "lucide-react";

const ACCEPT = "image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.csv,*/*";

export function EvidencesDialog({
  actionId,
  open,
  onOpenChange,
}: { actionId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const evidences = useQuery({
    queryKey: actionId ? qk.evidences(actionId) : ["evidences", "none"],
    queryFn: () => api.listEvidences(actionId!),
    enabled: !!actionId && open,
  });
  const managers = useQuery({ queryKey: qk.managers, queryFn: api.listManagers });
  const [file, setFile] = useState<File | null>(null);
  const [desc, setDesc] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");

  const previewUrl = useMemo(() => {
    if (!file || !file.type.startsWith("image/")) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const reset = () => { setFile(null); setDesc(""); setUploadedBy(""); };

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !actionId) throw new Error("Arquivo obrigatório");
      if (!uploadedBy) throw new Error("Selecione quem enviou");
      const path = `${actionId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("evidences").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("evidences").insert({
        action_id: actionId,
        file_url: path,
        file_name: file.name,
        file_type: fileKind(file.name),
        uploaded_by: uploadedBy,
        description: desc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evidência enviada!");
      qc.invalidateQueries({ queryKey: qk.evidences(actionId!) });
      qc.invalidateQueries({ queryKey: ["evidences-by-client"] });
      qc.invalidateQueries({ queryKey: ["evidences-counts"] });
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("Excluir esta evidência?")) throw new Error("cancelled");
      const { error } = await supabase.from("evidences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evidência excluída");
      qc.invalidateQueries({ queryKey: qk.evidences(actionId!) });
      qc.invalidateQueries({ queryKey: ["evidences-by-client"] });
      qc.invalidateQueries({ queryKey: ["evidences-counts"] });
    },
    onError: (e: Error) => { if (e.message !== "cancelled") toast.error(e.message); },
  });

  const canSubmit = !!file && !!uploadedBy && !upload.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Evidências</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2">
            {(evidences.data ?? []).map((e) => {
              const m = (managers.data ?? []).find((m) => m.id === e.uploaded_by);
              return <EvidenceRow key={e.id} e={e} managerName={m?.name} onDelete={() => del.mutate(e.id)} />;
            })}
            {(evidences.data ?? []).length === 0 && <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma evidência ainda.</div>}
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <Label className="mb-2 flex items-center gap-2 text-sm font-semibold"><Upload className="h-4 w-4" /> Nova evidência</Label>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm hover:bg-secondary/80">
                  Escolher ficheiro
                  <input
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <span className="text-sm text-muted-foreground">{file ? file.name : "Nenhum arquivo selecionado"}</span>
              </div>
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="max-h-40 rounded border border-border object-contain" />
              )}
              <Textarea placeholder="Descrição da evidência (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <div>
                <Label className="mb-1 block text-xs">Enviado por</Label>
                <Select value={uploadedBy} onValueChange={setUploadedBy}>
                  <SelectTrigger><SelectValue placeholder="Selecione um gestor" /></SelectTrigger>
                  <SelectContent>
                    {(managers.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!canSubmit}
                onClick={() => upload.mutate()}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                Enviar evidência
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceRow({
  e,
  managerName,
  onDelete,
}: {
  e: { id: string; file_url: string; file_name: string | null; file_type: string | null; description: string | null; uploaded_at: string };
  managerName?: string;
  onDelete: () => void;
}) {
  const url = useQuery({
    queryKey: ["evidence-signed-url", e.id, e.file_url],
    queryFn: () => getEvidenceSignedUrl(e.file_url),
    staleTime: 50 * 60 * 1000,
  });
  const href = url.data ?? "#";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
      {e.file_type === "image" ? (
        url.data ? (
          <img src={url.data} alt={e.file_name ?? ""} className="h-14 w-14 rounded object-cover" />
        ) : (
          <div className="h-14 w-14 rounded bg-card" />
        )
      ) : (
        <div className="grid h-14 w-14 place-items-center rounded bg-card">
          {e.file_type === "pdf" ? <FileText className="h-6 w-6 text-destructive" /> :
           e.file_type === "excel" ? <FileSpreadsheet className="h-6 w-6 text-[oklch(0.45_0.15_155)]" /> :
           <FileIcon className="h-6 w-6 text-muted-foreground" />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <a href={href} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:underline">{e.file_name}</a>
        <div className="text-xs text-muted-foreground">
          Enviado por {managerName ?? "—"} em {new Date(e.uploaded_at).toLocaleString("pt-BR")}
        </div>
        {e.description && <div className="mt-1 text-xs">{e.description}</div>}
      </div>
      <a href={href} target="_blank" rel="noreferrer" className="rounded p-2 hover:bg-secondary"><Download className="h-4 w-4" /></a>
      <button onClick={onDelete} className="rounded p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}
