import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — MedMais CX Hub" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Check profile status
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("status")
        .eq("id", data.user!.id)
        .maybeSingle();
      if (profile?.status === "pending") {
        toast.error("Seu cadastro está aguardando aprovação do administrador.");
      } else if (profile?.status === "rejected") {
        toast.error("Seu acesso foi negado. Entre em contato com o administrador.");
      } else {
        toast.success("Bem-vindo!");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error("E-mail ou senha incorretos.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-[#f5f7fa] to-[#e8edf2] p-6">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold">
            <span className="text-[#1a2f4a]">MedMais CX</span> <span className="text-primary">Hub</span>
          </h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-foreground">Entrar</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Mostrar senha"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Solicitar acesso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
