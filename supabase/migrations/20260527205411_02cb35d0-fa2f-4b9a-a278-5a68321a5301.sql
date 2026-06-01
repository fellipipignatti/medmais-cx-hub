
-- user_profiles
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Helpers (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = _uid AND role = 'admin' AND status = 'approved')
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = _uid AND status = 'approved')
$$;

-- Auto-create profile on signup; first user becomes admin/approved
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_first boolean;
BEGIN
  SELECT count(*) = 0 INTO v_first FROM public.user_profiles;
  INSERT INTO public.user_profiles (id, full_name, email, role, status, approved_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN v_first THEN 'admin' ELSE 'user' END,
    CASE WHEN v_first THEN 'approved' ELSE 'pending' END,
    CASE WHEN v_first THEN now() ELSE NULL END
  );
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS for user_profiles
CREATE POLICY "own profile read" ON public.user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "admin update profiles" ON public.user_profiles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin delete profiles" ON public.user_profiles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Tighten existing tables: require approved users
DROP POLICY IF EXISTS "auth read clients" ON public.clients;
DROP POLICY IF EXISTS "auth write clients" ON public.clients;
CREATE POLICY "approved read clients" ON public.clients FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved write clients" ON public.clients FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "auth read managers" ON public.managers;
DROP POLICY IF EXISTS "auth write managers" ON public.managers;
CREATE POLICY "approved read managers" ON public.managers FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved write managers" ON public.managers FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "auth read cm" ON public.client_managers;
DROP POLICY IF EXISTS "auth write cm" ON public.client_managers;
CREATE POLICY "approved read cm" ON public.client_managers FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved write cm" ON public.client_managers FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "auth read atypes" ON public.action_types;
DROP POLICY IF EXISTS "auth write atypes" ON public.action_types;
CREATE POLICY "approved read atypes" ON public.action_types FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved write atypes" ON public.action_types FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "auth read actions" ON public.actions;
DROP POLICY IF EXISTS "auth write actions" ON public.actions;
CREATE POLICY "approved read actions" ON public.actions FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved write actions" ON public.actions FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "auth read evid" ON public.evidences;
DROP POLICY IF EXISTS "auth write evid" ON public.evidences;
CREATE POLICY "approved read evid" ON public.evidences FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved write evid" ON public.evidences FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
