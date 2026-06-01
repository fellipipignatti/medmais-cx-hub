import { z } from "zod";

export const AnalysisSchema = z.object({
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

const SYSTEM_PROMPT = `Você é um analista sênior de CX da MedMais. Analise o feedback e retorne APENAS um JSON válido sem texto antes ou depois.

CATEGORIAS:
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

Retorne exatamente: {"categoria":"...","subcategoria":"...","sentimento":"Positivo|Negativo|Neutro","prioridade":"Urgente|Alta|Média|Baixa|Reconhecer","responsavel":"...","plano1":"...","plano2":"...","sla":"...","justificativa":"..."}`;

export async function analyzeFeedback(input: {
  feedback: string;
  contrato?: string;
  nps?: string;
}): Promise<{ ok: true; analysis: Analysis } | { ok: false; error: string }> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "VITE_ANTHROPIC_API_KEY não configurada" };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `FEEDBACK: ${input.feedback}\nCONTRATO: ${input.contrato || "Não informado"}\nNPS: ${input.nps || "Não informado"}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = AnalysisSchema.parse(JSON.parse(clean));
    return { ok: true, analysis: parsed };
  } catch (err) {
    return { ok: false, error: "Falha ao chamar a IA. Verifique a chave de API." };
  }
}

export async function saveAnalysis(_input: unknown) {
  return { ok: true, id: crypto.randomUUID() };
}

export async function countTemplates() {
  return { count: 0 };
}
