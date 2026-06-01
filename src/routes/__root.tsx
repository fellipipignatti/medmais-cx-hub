import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/cx/AppSidebar";
import { AuthGate } from "@/components/cx/AuthGate";
import { UserMenu } from "@/components/cx/UserMenu";
import "../styles.css";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <AppShell />
      </AuthGate>
      <Toaster richColors position="top-right" closeButton duration={3000} />
    </QueryClientProvider>
  );
}

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/login" || pathname === "/register") {
    return <Outlet />;
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <span className="text-sm font-semibold text-foreground">MedMais CX Hub</span>
            <UserMenu />
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
