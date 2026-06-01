
-- TABLES
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  segment text,
  birthday_date date,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.client_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES public.managers(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'gestor_contrato',
  UNIQUE (client_id, manager_id, relationship_type)
);

CREATE TABLE public.action_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  recurrence text NOT NULL DEFAULT 'unica'
);

CREATE TABLE public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  action_type_id uuid NOT NULL REFERENCES public.action_types(id),
  responsible_manager_id uuid REFERENCES public.managers(id),
  due_date date,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pendente',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  file_type text,
  uploaded_by uuid REFERENCES public.managers(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  description text
);

-- GRANTS (open access — internal tool, no auth)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.managers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_managers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_types TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidences TO anon, authenticated;
GRANT ALL ON public.clients, public.managers, public.client_managers, public.action_types, public.actions, public.evidences TO service_role;

-- RLS open
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.managers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.client_managers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.action_types FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.actions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.evidences FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- STORAGE bucket for evidences
INSERT INTO storage.buckets (id, name, public) VALUES ('evidences', 'evidences', true);

CREATE POLICY "public read evidences" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'evidences');
CREATE POLICY "public upload evidences" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'evidences');
CREATE POLICY "public delete evidences" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'evidences');

-- AUTO STATUS: mark overdue
CREATE OR REPLACE FUNCTION public.refresh_action_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL THEN
    NEW.status := 'concluida';
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'atrasada';
  ELSE
    NEW.status := 'pendente';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_actions_status
BEFORE INSERT OR UPDATE ON public.actions
FOR EACH ROW EXECUTE FUNCTION public.refresh_action_status();
