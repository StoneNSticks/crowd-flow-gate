import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import QrScanner from "qr-scanner";
import {
  CameraOff,
  CheckCircle2,
  Loader2,
  QrCode,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { lookupTicket, redeemTicket, type ScanResult } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/scan")({
  component: ScanPage,
});

type Phase = "idle" | "loading" | "result" | "redeeming";

function ScanPage() {
  const lookup = useServerFn(lookupTicket);
  const redeem = useServerFn(redeemTicket);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const busyRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [code, setCode] = useState("");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCode(raw: string) {
    if (busyRef.current) return;
    const value = extractCode(raw);
    if (!value) return;
    busyRef.current = true;
    setCode(value);
    setPhase("loading");
    setErrorMessage(null);
    setResult(null);
    try {
      const res = await lookup({ data: { code: value } });
      setResult(res);
      setPhase("result");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `Prüfung fehlgeschlagen: ${err.message}`
          : "Prüfung fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.",
      );
      setPhase("idle");
    } finally {
      busyRef.current = false;
    }
  }

  async function confirmRedeem() {
    if (!code) return;
    setPhase("redeeming");
    setErrorMessage(null);
    try {
      const res = await redeem({ data: { code } });
      setResult(res);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `Einlösen fehlgeschlagen: ${err.message}`
          : "Einlösen fehlgeschlagen. Bitte erneut versuchen.",
      );
    } finally {
      setPhase("result");
    }
  }

  function reset() {
    setResult(null);
    setCode("");
    setManual("");
    setErrorMessage(null);
    setPhase("idle");
    void scannerRef.current?.start();
  }

  useEffect(() => {
    if (!cameraOn || !videoRef.current) return;
    const scanner = new QrScanner(
      videoRef.current,
      (res) => {
        void scanner.stop();
        void handleCode(res.data);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 4 },
    );
    scannerRef.current = scanner;
    scanner.start().catch(() => {
      setCameraError(
        "Kamera konnte nicht gestartet werden. Bitte Zugriff erlauben oder den Code manuell eingeben.",
      );
    });
    return () => {
      scanner.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  useEffect(() => {
    if (phase === "result") void scannerRef.current?.stop();
  }, [phase]);

  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-eyebrow text-muted-foreground">Einlasskontrolle</p>
          <h1 className="font-display text-2xl font-700">Tickets scannen</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCameraOn((v) => !v)}>
          {cameraOn ? <CameraOff className="size-4" /> : <QrCode className="size-4" />}
          {cameraOn ? "Kamera aus" : "Kamera an"}
        </Button>
      </div>

      {cameraOn && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-black">
          <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        </div>
      )}
      {cameraError && (
        <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          {cameraError}
        </p>
      )}

      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleCode(manual);
        }}
      >
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Code manuell eingeben"
          inputMode="text"
          autoCapitalize="characters"
        />
        <Button type="submit" variant="secondary" disabled={phase === "loading"}>
          Prüfen
        </Button>
      </form>

      {errorMessage && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {errorMessage}
        </p>
      )}

      {phase === "loading" && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Ticket wird geprüft …
        </div>
      )}

      {result && (phase === "result" || phase === "redeeming") && (
        <ResultCard
          result={result}
          busy={phase === "redeeming"}
          onRedeem={confirmRedeem}
          onReset={reset}
        />
      )}
    </div>
  );
}

function ResultCard({
  result,
  busy,
  onRedeem,
  onReset,
}: {
  result: ScanResult;
  busy: boolean;
  onRedeem: () => void;
  onReset: () => void;
}) {
  const kind = result.result;
  const tone =
    kind === "valid"
      ? "border-success/50 bg-success/10"
      : kind === "redeemed"
        ? "border-success/50 bg-success/10"
        : "border-destructive/50 bg-destructive/10";

  return (
    <div className={`mt-6 rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-center gap-2">
        {kind === "valid" || kind === "redeemed" ? (
          <CheckCircle2 className="size-6 text-success" />
        ) : kind === "not_found" ? (
          <ShieldAlert className="size-6 text-destructive" />
        ) : (
          <XCircle className="size-6 text-destructive" />
        )}
        <p className="font-display text-xl font-700">
          {kind === "valid"
            ? "Gültig"
            : kind === "redeemed"
              ? "Eingelöst"
              : kind === "already_used"
                ? "Bereits verwendet"
                : kind === "cancelled"
                  ? "Storniert"
                  : "Ungültiger Code"}
        </p>
      </div>

      {result.result !== "not_found" ? (
        <dl className="mt-4 space-y-1.5 text-sm">
          <Row label="Name" value={result.holder_name} />
          <Row label="Kategorie" value={result.ticket_type} />
          <Row label="Event" value={result.event_title} />
          {result.redeemed_at && (
            <Row label="Eingelöst am" value={formatDateTime(result.redeemed_at)} />
          )}
        </dl>
      ) : (
        <p className="mt-3 text-sm">
          Dieser Code existiert nicht. Bitte Ticket erneut scannen oder den Code manuell prüfen.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {kind === "valid" && (
          <Button size="lg" onClick={onRedeem} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Einlass bestätigen
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={onReset}>
          <RotateCcw className="size-4" />
          Nächstes Ticket
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-500">{value}</dd>
    </div>
  );
}

/** Accepts a raw code or a ticket URL containing ?code= / /t/<code>. */
function extractCode(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const fromQuery = url.searchParams.get("code");
    if (fromQuery) return fromQuery.trim();
    const last = url.pathname.split("/").filter(Boolean).pop();
    if (last) return last.trim();
  } catch {
    /* not a URL */
  }
  return value;
}
