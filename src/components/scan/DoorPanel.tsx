import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, UserCheck, Users } from "lucide-react";
import {
  redeemTicket,
  scannerListEvents,
  scannerSearchGuests,
  type DoorEvent,
  type DoorGuest,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";

export function DoorPanel({ refreshKey }: { refreshKey: number }) {
  const listEvents = useServerFn(scannerListEvents);
  const search = useServerFn(scannerSearchGuests);
  const redeem = useServerFn(redeemTicket);

  const [events, setEvents] = useState<DoorEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [query, setQuery] = useState("");
  const [guests, setGuests] = useState<DoorGuest[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    try {
      const list = await listEvents();
      setEvents(list);
      setEventId((cur) => cur || list[0]?.id || "");
    } catch {
      /* counter is optional; ignore offline errors */
    }
  }

  useEffect(() => {
    void loadEvents();
    const t = setInterval(() => void loadEvents(), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!eventId || query.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      setGuests(await search({ data: { eventId, query } }));
    } catch {
      setError("Suche fehlgeschlagen. Bitte Verbindung prüfen.");
    } finally {
      setSearching(false);
    }
  }

  async function checkIn(code: string) {
    setBusyCode(code);
    setError(null);
    try {
      await redeem({ data: { code } });
      await Promise.all([runSearch(), loadEvents()]);
    } catch {
      setError("Einlassen fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusyCode(null);
    }
  }

  const current = events.find((e) => e.id === eventId);
  if (events.length === 0) return null;

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <h2 className="font-display text-base font-700">Einlass vor Ort</h2>
      </div>

      <select
        value={eventId}
        onChange={(e) => {
          setEventId(e.target.value);
          setGuests(null);
        }}
        className="mt-3 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
          </option>
        ))}
      </select>

      {current && (
        <div className="mt-3">
          <p className="text-sm">
            <span className="font-display text-2xl font-700">{current.checkedIn}</span>
            <span className="text-muted-foreground"> von {current.total} eingecheckt</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${current.total ? (current.checkedIn / current.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={runSearch} className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Gast nach Namen suchen"
        />
        <Button type="submit" variant="secondary" disabled={searching || query.trim().length < 2}>
          {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Suchen
        </Button>
      </form>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {guests && (
        <ul className="mt-3 divide-y divide-border">
          {guests.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">Kein Gast mit diesem Namen gefunden.</li>
          )}
          {guests.map((g) => (
            <li key={g.code} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-500">{g.holder_name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.ticket_type}
                  {g.status === "redeemed" && g.redeemed_at && ` · eingelassen ${formatDateTime(g.redeemed_at)}`}
                  {g.status === "cancelled" && " · storniert"}
                </p>
              </div>
              {g.status === "valid" ? (
                <Button size="sm" onClick={() => void checkIn(g.code)} disabled={busyCode === g.code}>
                  {busyCode === g.code ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
                  Einlassen
                </Button>
              ) : (
                <span className="shrink-0 text-xs font-600 text-muted-foreground">
                  {g.status === "redeemed" ? "Schon drin" : "Ungültig"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
