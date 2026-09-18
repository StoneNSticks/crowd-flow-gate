import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_NAME } from "@/lib/brand";
import { SiteHeader } from "@/components/site/SiteHeader";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: `Anmelden — ${BRAND_NAME}` },
      {
        name: "description",
        content: `Anmeldung zum Verwaltungsbereich von ${BRAND_NAME} für Event-Verwaltung und Einlasskontrolle.`,
      },
      { property: "og:title", content: `Anmelden — ${BRAND_NAME}` },
      { property: "og:description", content: "Interner Zugang für Veranstalter und Einlassteam." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen haben."),
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const target = safePath(search.redirect) ?? "/admin";

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: target, replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Bitte prüfe deine Eingaben.");
      return;
    }
    setBusy(true);
    setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        navigate({ to: target, replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: target, replace: true });
        } else {
          setInfo(
            "Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte bestätige deine Adresse und melde dich anschließend an.",
          );
          setMode("signin");
        }
      }
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card-surface p-6 sm:p-8">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-700">
              {mode === "signin" ? "Anmelden" : "Konto erstellen"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Zugang zum Verwaltungsbereich für Veranstalter und Einlassteam.
            </p>

            {info && (
              <p className="mt-5 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
                {info}
              </p>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {mode === "signin" ? "Anmelden" : "Konto erstellen"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setInfo(null);
              }}
              className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {mode === "signin"
                ? "Noch kein Konto? Jetzt registrieren"
                : "Bereits registriert? Zur Anmeldung"}
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Neue Konten erhalten erst nach Freigabe durch eine Administratorin oder einen
            Administrator Zugriff.
          </p>
        </div>
      </main>
    </div>
  );
}

function safePath(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

function translateAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/Invalid login credentials/i.test(message)) return "E-Mail oder Passwort ist falsch.";
  if (/Email not confirmed/i.test(message))
    return "Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der Bestätigungs-E-Mail.";
  if (/already registered/i.test(message))
    return "Für diese E-Mail-Adresse existiert bereits ein Konto.";
  if (/rate limit/i.test(message))
    return "Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.";
  return message;
}
