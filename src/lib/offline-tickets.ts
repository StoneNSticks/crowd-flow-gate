import type { PublicTicket } from "./tickets.functions";

/**
 * Local copy of tickets a visitor already opened, so the QR code still shows
 * at the door when the connection is bad or gone.
 */
const STORAGE_KEY = "gc_offline_tickets_v1";
const MAX_TICKETS = 30;

interface StoredTicket {
  ticket: PublicTicket;
  savedAt: string;
}

type Store = Record<string, StoredTicket>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Store) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.entries(store)
      .sort((a, b) => b[1].savedAt.localeCompare(a[1].savedAt))
      .slice(0, MAX_TICKETS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* storage full or disabled: offline copy is a bonus, never required */
  }
}

export function saveTicketOffline(ticket: PublicTicket | null | undefined): void {
  if (!ticket?.id) return;
  const store = readStore();
  store[ticket.id] = { ticket, savedAt: new Date().toISOString() };
  writeStore(store);
}

export function saveTicketsOffline(tickets: readonly PublicTicket[] | null | undefined): void {
  if (!tickets?.length) return;
  const store = readStore();
  const savedAt = new Date().toISOString();
  for (const ticket of tickets) {
    if (ticket?.id) store[ticket.id] = { ticket, savedAt };
  }
  writeStore(store);
}

export function loadTicketOffline(id: string): PublicTicket | null {
  return readStore()[id]?.ticket ?? null;
}

export function listOfflineTickets(): PublicTicket[] {
  return Object.values(readStore())
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .map((entry) => entry.ticket);
}
