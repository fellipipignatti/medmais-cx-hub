
-- 1) Fix function search_path
CREATE OR REPLACE FUNCTION public.refresh_action_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
$function$;

-- 2) Drop open-all policies and replace with authenticated-only policies
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','managers','client_managers','action_types','actions','evidences']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "open all" ON public.%I', t);
  END LOOP;
END $$;

-- Revoke anon access; keep authenticated/service_role
REVOKE ALL ON public.clients, public.managers, public.client_managers,
              public.action_types, public.actions, public.evidences FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.clients, public.managers, public.client_managers,
  public.action_types, public.actions, public.evidences
TO authenticated;

GRANT ALL ON
  public.clients, public.managers, public.client_managers,
  public.action_types, public.actions, public.evidences
TO service_role;

-- Authenticated-only policies for all CX tables
CREATE POLICY "auth read clients"   ON public.clients         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write clients"  ON public.clients         FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read managers"  ON public.managers        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write managers" ON public.managers        FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read cm"        ON public.client_managers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write cm"       ON public.client_managers FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read atypes"    ON public.action_types    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write atypes"   ON public.action_types    FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read actions"   ON public.actions         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write actions"  ON public.actions         FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read evid"      ON public.evidences       FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write evid"     ON public.evidences       FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- 3) Storage policies for 'evidences' bucket — authenticated only
DROP POLICY IF EXISTS "public read evidences"   ON storage.objects;
DROP POLICY IF EXISTS "public upload evidences" ON storage.objects;
DROP POLICY IF EXISTS "public delete evidences" ON storage.objects;

CREATE POLICY "auth read evidences"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidences');

CREATE POLICY "auth upload evidences"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidences');

CREATE POLICY "auth update evidences"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'evidences');

CREATE POLICY "auth delete evidences"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidences');
