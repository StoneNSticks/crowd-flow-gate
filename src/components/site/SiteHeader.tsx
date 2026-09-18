import { Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 surface-ink">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Ticket className="size-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[0.95rem] font-700 tracking-tight">
              {BRAND_NAME}
            </span>
            <span className="text-[0.7rem] text-ink-muted">Tickets &amp; Einlass</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="rounded-md px-3 py-2 text-ink-muted transition-colors hover:text-ink-foreground"
          >
            Events
          </Link>
          <Link
            to="/admin"
            className="rounded-md px-3 py-2 text-ink-muted transition-colors hover:text-ink-foreground"
          >
            Verwaltung
          </Link>
        </nav>
      </div>
    </header>
  );
}
