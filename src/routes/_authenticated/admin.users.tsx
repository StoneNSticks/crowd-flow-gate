import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Search, ShieldCheck, ScanLine, Crown, UserX } from "lucide-react";
import { listManagedUsers, setUserAccessLevel, type AccessLevel } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: `Benutzer und Rechte | ${BRAND_NAME}` },
      {
        name: "description",
        content: `Rechteverwaltung für Konten im Verwaltungsbereich von ${BRAND_NAME}.`,
      },
      { property: "og:title", content: `Benutzer und Rechte | ${BRAND_NAME}` },
      { property: "og:description", content: "Berechtigungen vergeben und einsehen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-700">Zugriff nicht möglich</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Unbekannter Fehler"}
      </p>
    </div>
  ),
});

const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "Keine Freigabe" },
  { value: "scanner", label: "Nur Einlass scannen" },
  { value: "admin", label: "Admin (alle Rechte)" },
];

function levelBadge(level: AccessLevel) {
  if (level === "super_admin")
    return (
      <Badge className="gap-1 bg-amber-500 text-slate-900 hover:bg-amber-500">
        <Crown className="size-3" /> Super Admin
      </Badge>
    );
  if (level === "admin")
    return (
      <Badge className="gap-1">
        <ShieldCheck className="size-3" /> Admin
      </Badge>
    );
  if (level === "scanner")
    return (
      <Badge variant="secondary" className="gap-1">
        <ScanLine className="size-3" /> Scanner
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <UserX className="size-3" /> Keine Freigabe
    </Badge>
  );
}

function UsersPage() {
  const fetchUsers = useServerFn(listManagedUsers);
  const saveLevel = useServerFn(setUserAccessLevel);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isPending, error } = useQuery({
    queryKey: ["managed-users"],
    queryFn: () => fetchUsers(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; level: AccessLevel }) => saveLevel({ data: vars }),
    onSuccess: () => {
      toast.success("Berechtigung gespeichert.");
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Speichern nicht möglich."),
  });

  const users = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((u) => u.email.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 min-[360px]:px-4 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-700 sm:text-3xl">Benutzer und Rechte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lege fest, wer Events verwalten und wer nur Tickets scannen darf.
        </p>
      </header>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nach E-Mail suchen"
          className="pl-9"
          aria-label="Benutzer suchen"
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Liste konnte nicht geladen werden."}
        </p>
      ) : isPending ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Keine Konten gefunden.
        </p>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="rounded-xl border bg-card p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate font-600">{u.email}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Registriert am{" "}
                  {new Date(u.created_at).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                  {u.last_sign_in_at
                    ? ` · Letzte Anmeldung ${new Date(u.last_sign_in_at).toLocaleDateString("de-DE")}`
                    : ""}
                </p>
                <div className="mt-2">{levelBadge(u.level)}</div>
              </div>

              <div className="mt-3 shrink-0 sm:mt-0 sm:w-56">
                {u.level === "super_admin" ? (
                  <p className="text-xs text-muted-foreground">
                    {u.isSelf
                      ? "Dein eigenes Konto. Rechte sind fest vergeben."
                      : "Super Admin, nicht veränderbar."}
                  </p>
                ) : (
                  <Select
                    value={u.level}
                    onValueChange={(value) =>
                      mutation.mutate({ userId: u.id, level: value as AccessLevel })
                    }
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger aria-label={`Berechtigung für ${u.email}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
