import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, LogOut, QrCode, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { BRAND_SHORT } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-700">Zugriff nicht möglich</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function AdminLayout() {
  const fetchRoles = useServerFn(getMyRoles);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fetchRoles(),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-40 border-b border-white/10 surface-ink">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/admin" className="font-display text-sm font-700 tracking-tight">
            {BRAND_SHORT} Verwaltung
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {data?.isAdmin && (
              <Link
                to="/admin"
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-white/10 text-ink-foreground" }}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-ink-muted transition-colors hover:text-ink-foreground"
              >
                <CalendarDays className="size-4" />
                <span className="hidden sm:inline">Events</span>
              </Link>
            )}
            <Link
              to="/admin/scan"
              activeProps={{ className: "bg-white/10 text-ink-foreground" }}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-ink-muted transition-colors hover:text-ink-foreground"
            >
              <QrCode className="size-4" />
              <span className="hidden sm:inline">Scannen</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-ink-muted hover:bg-white/10 hover:text-ink-foreground"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Abmelden</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {isPending ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !data?.isAdmin && !data?.isScanner ? (
          <div className="mx-auto max-w-lg px-4 py-20 text-center">
            <h1 className="font-display text-2xl font-700">Noch keine Berechtigung</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Dein Konto ({data?.email ?? "unbekannt"}) hat noch keine Rolle. Bitte eine
              Administratorin oder einen Administrator, dir die Rolle „Admin“ oder „Scanner“
              zuzuweisen.
            </p>
            <Button variant="outline" className="mt-6" onClick={signOut}>
              Abmelden
            </Button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
