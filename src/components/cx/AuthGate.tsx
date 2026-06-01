import { useEffect, type ReactNode } from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/cx/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PUBLIC_ROUTES = ["/login", "/register"];

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, profile, loading, isApproved } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublic) {
      navigate({ to: "/login" });
    } else if (session && isApproved && isPublic) {
      navigate({ to: "/" });
    }
  }, [loading, session, isApproved, isPublic, navigate]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>;
  }

  if (isPublic) return <>{children}</>;

  if (!session) return null;

  // Authenticated but not yet approved
  if (profile && !isApproved) {
    return <StatusScreen profileStatus={profile.status} />;
  }

  if (!profile) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Configurando seu perfil…</div>;
  }

  return <>{children}</>;
}

function StatusScreen({ profileStatus }: { profileStatus: "pending" | "rejected" | "approved" }) {
  const messages = {
    pending: {
      title: "Aguardando aprovação",
      body: "Seu cadastro está sendo analisado pelo administrador. Você receberá acesso após a aprovação.",
    },
    rejected: {
      title: "Acesso negado",
      body: "Seu acesso foi negado. Entre em contato com o administrador.",
    },
    approved: { title: "", body: "" },
  };
  const m = messages[profileStatus];

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-[#f5f7fa] to-[#e8edf2] p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-foreground">{m.title}</h1>
        <p className="text-sm text-muted-foreground">{m.body}</p>
        <Button variant="outline" onClick={signOut} className="w-full">Sair</Button>
      </div>
    </div>
  );
}
