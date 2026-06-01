import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Solicitar acesso — MedMais CX Hub" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("A senha deve ter pelo menos 8 caracteres.");
    if (password !== confirm) return toast.error("As senhas não conferem.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      // Sign out so user does not enter the app while pending
      await supabase.auth.signOut();
      setDone(true);
    } catch (err) {
      toast.error((err as Error).message);
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
          {done ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h2 className="text-xl font-bold">Solicitação enviada!</h2>
              <p className="text-sm text-muted-foreground">
                Seu cadastro está sendo analisado pelo administrador. Você receberá acesso após a aprovação.
              </p>
              <Link to="/login" className="inline-block text-sm font-medium text-primary hover:underline">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-6 text-xl font-bold text-foreground">Solicitar acesso</h2>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email">E-mail corporativo</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="confirm">Confirmar senha</Label>
                  <Input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Enviando…" : "Solicitar acesso"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
