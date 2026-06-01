CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.cx_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback TEXT NOT NULL,
  contrato TEXT,
  nps TEXT,
  ai_suggestion JSONB,
  final_categoria TEXT NOT NULL,
  final_subcategoria TEXT,
  final_sentimento TEXT NOT NULL,
  final_prioridade TEXT NOT NULL,
  final_responsavel TEXT NOT NULL,
  final_plano1 TEXT NOT NULL,
  final_plano2 TEXT,
  final_sla TEXT,
  final_justificativa TEXT,
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_analyses TO authenticated;
GRANT ALL ON public.cx_analyses TO service_role;

ALTER TABLE public.cx_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved read analyses" ON public.cx_analyses
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

CREATE POLICY "approved insert analyses" ON public.cx_analyses
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "approved update analyses" ON public.cx_analyses
  FOR UPDATE TO authenticated USING (is_approved(auth.uid())) WITH CHECK (is_approved(auth.uid()));

CREATE POLICY "approved delete analyses" ON public.cx_analyses
  FOR DELETE TO authenticated USING (is_approved(auth.uid()));

CREATE INDEX idx_cx_analyses_template ON public.cx_analyses(is_template) WHERE is_template = true;
CREATE INDEX idx_cx_analyses_created_at ON public.cx_analyses(created_at DESC);

CREATE TRIGGER cx_analyses_updated_at
  BEFORE UPDATE ON public.cx_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();