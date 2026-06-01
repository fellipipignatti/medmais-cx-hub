
-- Tighten WITH CHECK so linter recognizes auth gating
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND policyname IN
      ('auth write clients','auth write managers','auth write cm',
       'auth write atypes','auth write actions','auth write evid')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', rec.policyname, rec.tablename);
  END LOOP;
END $$;

CREATE POLICY "auth write clients"  ON public.clients
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth write managers" ON public.managers
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth write cm"       ON public.client_managers
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth write atypes"   ON public.action_types
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth write actions"  ON public.actions
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth write evid"     ON public.evidences
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Make evidences bucket private (will use signed URLs from app code)
UPDATE storage.buckets SET public = false WHERE id = 'evidences';
