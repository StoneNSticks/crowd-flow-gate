const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
        Die Bezahlung ist für echte Zahlungen noch nicht freigeschaltet.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-xs text-ink">
        Testmodus: Zahlungen in der Vorschau werden nicht wirklich abgebucht.
      </div>
    );
  }
  return null;
}
