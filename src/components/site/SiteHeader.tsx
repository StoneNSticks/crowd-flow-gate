import { Link } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import gcLogo from "@/assets/gc-logo-mark.png.asset.json";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 surface-ink">
      <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 min-[360px]:px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src={gcLogo.url}
            alt={`${BRAND_NAME} Logo`}
            className="size-9 shrink-0 rounded-lg object-cover"
          />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate font-display text-sm font-700 sm:text-[0.95rem]">
              {BRAND_NAME}
            </span>
            <span className="hidden text-[0.7rem] text-ink-muted min-[390px]:block">Tickets &amp; Einlass</span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-0 text-sm min-[390px]:gap-1" aria-label="Hauptnavigation">
          <Link
            to="/"
            className="flex min-h-11 items-center rounded-md px-2 text-ink-muted transition-colors hover:text-ink-foreground sm:px-3"
          >
            Events
          </Link>
          <Link
            to="/admin"
            className="flex min-h-11 items-center rounded-md px-2 text-ink-muted transition-colors hover:text-ink-foreground sm:px-3"
          >
            Verwaltung
          </Link>
        </nav>
      </div>
    </header>
  );
}
