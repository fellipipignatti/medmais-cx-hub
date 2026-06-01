import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/cx/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export function UserMenu() {
  const { profile } = useAuth();
  if (!profile) return null;

  const initials = profile.full_name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="ml-auto gap-2 px-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials || "U"}
          </span>
          <span className="hidden text-xs font-medium text-foreground sm:inline">{profile.full_name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{profile.full_name}</span>
            <span className="text-xs font-normal text-muted-foreground">{profile.email}</span>
            {profile.role === "admin" && (
              <span className="mt-1 text-[10px] font-bold uppercase text-primary">Admin</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon className="mr-2 h-4 w-4" /> Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
