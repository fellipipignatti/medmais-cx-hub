import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  feedback: z.string().min(1).max(5000),
  contrato: z.string().max(200).optional().default(""),
  nps: z.string().max(10).optional().default(""),
});

const AnalysisSchema = z.object({
  categoria: z.string(),
  subcategoria: z.string(),
  sentimento: z.enum(["Positivo", "Negativo", "Neutro"]),
  prioridade: z.enum(["Urgente", "Alta", "Média", "Baixa", "Reconhecer"]),
  responsavel: z.string(),
  plano1: z.string(),
  plano2: z.string(),
  sla: z.string(),
  justificativa: z.string(),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

const BASE_PROMPT = `Você é um analista sênior de CX da MedMais, empresa de terceirização de serviços de segurança, limpeza e facilities. Analise o feedback de cliente e retorne a classificação estruturada.

ÁRVORE DE CATEGORIAS OFICIAL (use exatamente esses nomes):
1. Remuneração, Benefícios e Pagamentos
2. Atendimento a Solicitações e Retornos
3. Equipamentos, EPIs e Infraestrutura
4. Gestão de Pessoas e Liderança
5. Equipe Operacional e Atendimento ao Cliente
6. Escala, Rotatividade e Dimensionamento
7. Treinamento e Desenvolvimento
8. Processos, Controles e Conformidade
9. Contratação e Políticas Internas
10. Relacionamento e Clima Interno
11. Qualidade, Inovação e Entrega do Serviço
12. Comunicação Geral e Proximidade da Empresa
13. Outros / Elogios Gerais

PADRÃO HISTÓRICO DE AÇÕES:
- Não entrega/Demora no retorno → Gestor de Contrato, 48h
- Falta de processos → Operações, 72h
- Gestão da equipe → Embaixador Regional, 5 dias
- Pagamento de colaboradores → RH/Financeiro, 24h
- Elogio ao time → Gestor de Contrato, sem prazo
- Qualidade dos serviços → Comercial/CX, sem prazo

Cada plano de ação deve ter no máximo 15 palavras. SLA deve ser ex: "24h", "48h", "72h", "5 dias" ou vazio se não aplicável.`;

export const analyzeFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "LOVABLE_API_KEY não configurada" };
    }

    try {
      // Few-shot: busca até 5 modelos curados pelos analistas
      const { data: templates } = await context.supabase
        .from("cx_analyses")
        .select(
          "feedback, final_categoria, final_subcategoria, final_sentimento, final_prioridade, final_responsavel, final_plano1, final_plano2, final_sla",
        )
        .eq("is_template", true)
        .order("updated_at", { ascending: false })
        .limit(5);

      let fewShot = "";
      if (templates && templates.length > 0) {
        fewShot =
          "\n\nMODELOS DE REFERÊNCIA (curados pelo analista de CX — siga este estilo):\n" +
          templates
            .map(
              (t, i) =>
                `Exemplo ${i + 1}:\nFEEDBACK: ${t.feedback}\nRESPOSTA: ${JSON.stringify({
                  categoria: t.final_categoria,
                  subcategoria: t.final_subcategoria ?? "",
                  sentimento: t.final_sentimento,
                  prioridade: t.final_prioridade,
                  responsavel: t.final_responsavel,
                  plano1: t.final_plano1,
                  plano2: t.final_plano2 ?? "",
                  sla: t.final_sla ?? "",
                })}`,
            )
            .join("\n\n");
      }

      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-3-flash-preview");

      const { experimental_output } = await generateText({
        model,
        system: BASE_PROMPT + fewShot,
        prompt: `FEEDBACK DO CLIENTE: ${data.feedback}\nCONTRATO: ${data.contrato || "Não informado"}\nNPS: ${data.nps || "Não informado"}`,
        experimental_output: Output.object({ schema: AnalysisSchema }),
      });

      return { ok: true as const, analysis: experimental_output as Analysis };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("analyzeFeedback failed:", msg);
      if (msg.includes("429")) return { ok: false as const, error: "Limite de requisições atingido. Tente novamente em instantes." };
      if (msg.includes("402")) return { ok: false as const, error: "Créditos de IA esgotados. Adicione créditos no workspace Lovable." };
      return { ok: false as const, error: "Falha ao chamar a IA" };
    }
  });

const SaveInputSchema = z.object({
  feedback: z.string().min(1).max(5000),
  contrato: z.string().max(200).optional().default(""),
  nps: z.string().max(10).optional().default(""),
  ai_suggestion: AnalysisSchema.nullable(),
  final: AnalysisSchema,
  is_template: z.boolean().optional().default(false),
});

export const saveAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error, data: inserted } = await supabase
      .from("cx_analyses")
      .insert({
        feedback: data.feedback,
        contrato: data.contrato || null,
        nps: data.nps || null,
        ai_suggestion: data.ai_suggestion,
        final_categoria: data.final.categoria,
        final_subcategoria: data.final.subcategoria || null,
        final_sentimento: data.final.sentimento,
        final_prioridade: data.final.prioridade,
        final_responsavel: data.final.responsavel,
        final_plano1: data.final.plano1,
        final_plano2: data.final.plano2 || null,
        final_sla: data.final.sla || null,
        final_justificativa: data.final.justificativa || null,
        is_template: data.is_template,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("saveAnalysis failed:", error.message);
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const, id: inserted.id };
  });

export const countTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("cx_analyses")
      .select("*", { count: "exact", head: true })
      .eq("is_template", true);
    return { count: count ?? 0 };
  });
