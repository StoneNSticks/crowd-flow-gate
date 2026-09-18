import { Link } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 surface-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-ink-muted">
          © {new Date().getFullYear()} {BRAND_NAME}
        </p>
        <nav className="flex flex-wrap gap-5 text-ink-muted">
          <Link to="/impressum" className="transition-colors hover:text-ink-foreground">
            Impressum
          </Link>
          <Link to="/datenschutz" className="transition-colors hover:text-ink-foreground">
            Datenschutz
          </Link>
        </nav>
      </div>
    </footer>
  );
}
