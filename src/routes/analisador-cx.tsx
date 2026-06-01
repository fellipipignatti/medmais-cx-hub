import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Download, Trash2, Sparkles, Loader2, X, Check, Star, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  analyzeFeedback,
  saveAnalysis,
  countTemplates,
  type Analysis,
} from "@/lib/cx/analyzer.functions";

export const Route = createFileRoute("/analisador-cx")({
  head: () => ({
    meta: [
      { title: "Analisador CX — MedMais CX Hub" },
      { name: "description", content: "Analise feedbacks de clientes com IA e gere planos de ação automáticos." },
    ],
  }),
  component: AnalisadorCxPage,
});

type RowStatus = "loading" | "draft" | "finalized";

type Row = {
  id: string;
  comentario: string;
  contrato: string;
  nps: string;
  status: RowStatus;
  ai_suggestion: Analysis | null;
  final: Analysis;
};

const EMPTY_ANALYSIS: Analysis = {
  categoria: "",
  subcategoria: "",
  sentimento: "Neutro",
  prioridade: "Média",
  responsavel: "",
  plano1: "",
  plano2: "",
  sla: "",
  justificativa: "",
};

const CATEGORIAS = [
  "Remuneração, Benefícios e Pagamentos",
  "Atendimento a Solicitações e Retornos",
  "Equipamentos, EPIs e Infraestrutura",
  "Gestão de Pessoas e Liderança",
  "Equipe Operacional e Atendimento ao Cliente",
  "Escala, Rotatividade e Dimensionamento",
  "Treinamento e Desenvolvimento",
  "Processos, Controles e Conformidade",
  "Contratação e Políticas Internas",
  "Relacionamento e Clima Interno",
  "Qualidade, Inovação e Entrega do Serviço",
  "Comunicação Geral e Proximidade da Empresa",
  "Outros / Elogios Gerais",
];

const SENTIMENTOS = ["Positivo", "Negativo", "Neutro"] as const;
const PRIORIDADES = ["Urgente", "Alta", "Média", "Baixa", "Reconhecer"] as const;

const sentimentoClass = (s?: string) => {
  switch (s) {
    case "Positivo": return "bg-green-100 text-green-800";
    case "Negativo": return "bg-red-100 text-red-800";
    case "Neutro": return "bg-yellow-100 text-yellow-800";
    default: return "bg-gray-100 text-gray-600";
  }
};

const prioridadeClass = (p?: string) => {
  switch (p) {
    case "Urgente": return "bg-red-100 text-red-800";
    case "Alta": return "bg-orange-100 text-orange-800";
    case "Média": return "bg-yellow-100 text-yellow-800";
    case "Baixa": return "bg-gray-100 text-gray-600";
    case "Reconhecer": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-600";
  }
};

const csvEscape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;

function AnalisadorCxPage() {
  const analyze = useServerFn(analyzeFeedback);
  const save = useServerFn(saveAnalysis);
  const countT = useServerFn(countTemplates);

  const [rows, setRows] = useState<Row[]>([]);
  const [comentario, setComentario] = useState("");
  const [contrato, setContrato] = useState("");
  const [nps, setNps] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [templateCount, setTemplateCount] = useState(0);

  const reloadTemplateCount = async () => {
    try {
      const r = await countT();
      setTemplateCount(r.count);
    } catch { /* ignore */ }
  };

  useEffect(() => { reloadTemplateCount(); /* eslint-disable-next-line */ }, []);

  const kpis = useMemo(() => {
    const done = rows.filter((r) => r.status !== "loading");
    return {
      total: done.length,
      pos: done.filter((r) => r.final.sentimento === "Positivo").length,
      neg: done.filter((r) => r.final.sentimento === "Negativo").length,
      finalizados: rows.filter((r) => r.status === "finalized").length,
    };
  }, [rows]);

  const runOne = async (text: string, ctr: string, n: string) => {
    const id = crypto.randomUUID();
    setRows((prev) => [
      ...prev,
      {
        id,
        comentario: text,
        contrato: ctr,
        nps: n,
        status: "loading",
        ai_suggestion: null,
        final: { ...EMPTY_ANALYSIS },
      },
    ]);
    try {
      const res = await analyze({ data: { feedback: text, contrato: ctr, nps: n } });
      if (!res.ok) {
        toast.error(res.error || "Erro ao analisar feedback.");
        setRows((prev) => prev.filter((r) => r.id !== id));
        return false;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "draft", ai_suggestion: res.analysis, final: { ...res.analysis } }
            : r,
        ),
      );
      return true;
    } catch {
      toast.error("Erro ao analisar feedback. Tente novamente.");
      setRows((prev) => prev.filter((r) => r.id !== id));
      return false;
    }
  };

  const handleAnalyze = async () => {
    const text = comentario.trim();
    if (!text) {
      toast.error("Cole um comentário antes de analisar.");
      return;
    }
    const pieces = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    setSubmitting(true);
    let anyOk = false;
    for (const piece of pieces) {
      const ok = await runOne(piece, contrato.trim(), nps.trim());
      anyOk = anyOk || ok;
    }
    setSubmitting(false);
    if (anyOk) {
      setComentario("");
      setContrato("");
      setNps("");
    }
  };

  const patchRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const patchFinal = (id: string, patch: Partial<Analysis>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, final: { ...r.final, ...patch } } : r)),
    );
  };

  const deleteRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const clearAll = () => {
    if (rows.length === 0) return;
    setRows([]);
    toast.success("Tabela limpa.");
  };

  const finalize = async (row: Row, asTemplate: boolean) => {
    if (!row.final.categoria || !row.final.responsavel || !row.final.plano1) {
      toast.error("Preencha ao menos categoria, responsável e plano 1.");
      return;
    }
    patchRow(row.id, { status: "loading" });
    try {
      const res = await save({
        data: {
          feedback: row.comentario,
          contrato: row.contrato,
          nps: row.nps,
          ai_suggestion: row.ai_suggestion,
          final: row.final,
          is_template: asTemplate,
        },
      });
      if (!res.ok) {
        toast.error(res.error || "Erro ao salvar.");
        patchRow(row.id, { status: "draft" });
        return;
      }
      patchRow(row.id, { status: "finalized" });
      toast.success(asTemplate ? "⭐ Salvo como modelo de referência!" : "✅ Análise finalizada.");
      if (asTemplate) reloadTemplateCount();
    } catch {
      toast.error("Erro ao salvar.");
      patchRow(row.id, { status: "draft" });
    }
  };

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.error("Nada para exportar.");
      return;
    }
    const headers = ["Comentário","Contrato","NPS","Categoria","Subcategoria","Sentimento","Prioridade","Responsável","Plano 1","Plano 2","SLA","Justificativa","Status"];
    const lines = [headers.map(csvEscape).join(",")];
    for (const r of rows) {
      lines.push([r.comentario, r.contrato, r.nps, r.final.categoria, r.final.subcategoria, r.final.sentimento, r.final.prioridade, r.final.responsavel, r.final.plano1, r.final.plano2, r.final.sla, r.final.justificativa, r.status].map(csvEscape).join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analise-cx-medmais-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Analisador de Feedbacks CX
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              IA sugere → você ajusta → finaliza. Marque os melhores como ⭐ modelo para a IA aprender.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant="outline" className="gap-1 py-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              {templateCount} {templateCount === 1 ? "modelo" : "modelos"} treinando a IA
            </Badge>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
            <Button variant="outline" onClick={clearAll}>
              <Trash2 className="h-4 w-4 mr-2" /> Limpar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Total analisados" value={kpis.total} color="text-foreground" />
          <Kpi label="Positivos" value={kpis.pos} color="text-green-700" />
          <Kpi label="Negativos" value={kpis.neg} color="text-red-700" />
          <Kpi label="Finalizados" value={kpis.finalizados} color="text-primary" />
        </div>

        {/* Cards verticais — mais espaço para edição */}
        <div className="space-y-4">
          {rows.length === 0 && (
            <Card className="p-10 text-center text-muted-foreground">
              Nenhum feedback analisado ainda. Cole um comentário abaixo para começar.
            </Card>
          )}
          {rows.map((r) => (
            <AnalysisCard
              key={r.id}
              row={r}
              onPatchFinal={(p) => patchFinal(r.id, p)}
              onPatchRow={(p) => patchRow(r.id, p)}
              onDelete={() => deleteRow(r.id)}
              onFinalize={() => finalize(r, false)}
              onSaveTemplate={() => finalize(r, true)}
            />
          ))}
        </div>

        {/* Input fixo no rodapé */}
        <Card className="sticky bottom-4 p-4 space-y-3 shadow-lg border-2">
          <Textarea
            placeholder="Cole aqui o comentário do cliente... (ou vários, um por linha)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <Input placeholder="Contrato (opcional)" value={contrato} onChange={(e) => setContrato(e.target.value)} className="max-w-xs" />
            <Input placeholder="NPS 0-10" value={nps} onChange={(e) => setNps(e.target.value)} className="max-w-[120px]" inputMode="numeric" />
            <div className="ml-auto">
              <Button onClick={handleAnalyze} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Analisar com IA
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function AnalysisCard({
  row,
  onPatchFinal,
  onDelete,
  onFinalize,
  onSaveTemplate,
}: {
  row: Row;
  onPatchFinal: (p: Partial<Analysis>) => void;
  onPatchRow: (p: Partial<Row>) => void;
  onDelete: () => void;
  onFinalize: () => void;
  onSaveTemplate: () => void;
}) {
  const locked = row.status === "finalized" || row.status === "loading";
  const f = row.final;
  const ai = row.ai_suggestion;

  const isAiDifferent = (field: keyof Analysis): boolean =>
    !!ai && String(ai[field] ?? "") !== String(f[field] ?? "");

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm whitespace-pre-wrap text-foreground">{row.comentario}</p>
          <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
            {row.contrato && <span>Contrato: <strong>{row.contrato}</strong></span>}
            {row.nps && <span>NPS: <strong>{row.nps}</strong></span>}
            {row.status === "finalized" && (
              <Badge className="bg-green-100 text-green-800">
                <Check className="h-3 w-3 mr-1" /> Finalizado
              </Badge>
            )}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Remover">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {row.status === "loading" && !ai && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Analisando com IA...
        </div>
      )}

      {ai && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Categoria" highlight={isAiDifferent("categoria")}>
              <Select value={f.categoria} onValueChange={(v) => onPatchFinal({ categoria: v })} disabled={locked}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subcategoria" highlight={isAiDifferent("subcategoria")}>
              <Input value={f.subcategoria} onChange={(e) => onPatchFinal({ subcategoria: e.target.value })} disabled={locked} className="h-9" />
            </Field>
            <Field label="Sentimento" highlight={isAiDifferent("sentimento")}>
              <Select value={f.sentimento} onValueChange={(v) => onPatchFinal({ sentimento: v as Analysis["sentimento"] })} disabled={locked}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SENTIMENTOS.map((s) => <SelectItem key={s} value={s}><Badge className={sentimentoClass(s)}>{s}</Badge></SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Prioridade" highlight={isAiDifferent("prioridade")}>
              <Select value={f.prioridade} onValueChange={(v) => onPatchFinal({ prioridade: v as Analysis["prioridade"] })} disabled={locked}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => <SelectItem key={p} value={p}><Badge className={prioridadeClass(p)}>{p}</Badge></SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Responsável" highlight={isAiDifferent("responsavel")}>
              <Input value={f.responsavel} onChange={(e) => onPatchFinal({ responsavel: e.target.value })} disabled={locked} className="h-9" />
            </Field>
            <Field label="SLA" highlight={isAiDifferent("sla")}>
              <Input value={f.sla} onChange={(e) => onPatchFinal({ sla: e.target.value })} disabled={locked} className="h-9" placeholder="ex: 48h" />
            </Field>
          </div>

          <Field label="Plano de ação 1" highlight={isAiDifferent("plano1")}>
            <Textarea value={f.plano1} onChange={(e) => onPatchFinal({ plano1: e.target.value })} disabled={locked} className="min-h-[60px]" />
          </Field>
          <Field label="Plano de ação 2" highlight={isAiDifferent("plano2")}>
            <Textarea value={f.plano2} onChange={(e) => onPatchFinal({ plano2: e.target.value })} disabled={locked} className="min-h-[60px]" />
          </Field>
          <Field label="Justificativa" highlight={isAiDifferent("justificativa")}>
            <Textarea value={f.justificativa} onChange={(e) => onPatchFinal({ justificativa: e.target.value })} disabled={locked} className="min-h-[50px]" />
          </Field>

          {!locked && (
            <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={onSaveTemplate}>
                    <Star className="h-4 w-4 mr-2" /> Finalizar como ⭐ modelo
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Salvar e usar como exemplo para treinar a IA</TooltipContent>
              </Tooltip>
              <Button onClick={onFinalize}>
                <Check className="h-4 w-4 mr-2" /> Finalizar
              </Button>
            </div>
          )}
          {row.status === "loading" && ai && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm justify-end">
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function Field({ label, highlight, children }: { label: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
        {highlight && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="h-4 text-[10px] px-1 border-primary text-primary">editado</Badge>
            </TooltipTrigger>
            <TooltipContent>Diferente da sugestão original da IA</TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
      <div className={`mt-1 text-3xl font-bold font-display ${color}`}>{value}</div>
    </Card>
  );
}
