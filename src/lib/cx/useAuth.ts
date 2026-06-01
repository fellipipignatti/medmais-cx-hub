import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
  status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, [qc]);

  const profileQ = useQuery({
    queryKey: ["user_profile", session?.user.id],
    enabled: !!session?.user.id,
    queryFn: async (): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserProfile | null;
    },
  });

  const profile = profileQ.data ?? null;
  return {
    session,
    profile,
    loading: !sessionReady || (!!session && profileQ.isLoading),
    isApproved: profile?.status === "approved",
    isAdmin: profile?.role === "admin" && profile?.status === "approved",
  };
}
