import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/cx/AppSidebar";
import { AuthGate } from "@/components/cx/AuthGate";
import { UserMenu } from "@/components/cx/UserMenu";
import { useRouterState } from "@tanstack/react-router";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MedMais CX Hub" },
      { name: "description", content: "Gestão de atividades e evidências por cliente." },
      { property: "og:title", content: "MedMais CX Hub" },
      { name: "twitter:title", content: "MedMais CX Hub" },
      { property: "og:description", content: "Gestão de atividades e evidências por cliente." },
      { name: "twitter:description", content: "Gestão de atividades e evidências por cliente." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f2d47619-5984-4001-af07-861cf1c39fe1/id-preview-9d2064a7--396053cf-a9db-41a8-9694-420ffcebb691.lovable.app-1779911702991.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f2d47619-5984-4001-af07-861cf1c39fe1/id-preview-9d2064a7--396053cf-a9db-41a8-9694-420ffcebb691.lovable.app-1779911702991.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

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
  // Public routes (login/register) render only their own content, no sidebar
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
