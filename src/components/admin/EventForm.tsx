import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { slugify, toLocalInputValue, fromLocalInputValue, formatMoney } from "@/lib/format";

export interface EventFormValues {
  id?: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  address: string | null;
  cover_image_url: string | null;
  sales_start_at: string | null;
  sales_end_at: string | null;
  max_tickets: number | null;
  is_active: boolean;
}

export interface TicketTypeDraft {
  name: string;
  description: string | null;
  price_cents: number;
  quantity: number;
}

interface DraftRow {
  key: string;
  name: string;
  price: string;
  quantity: string;
  description: string;
}

export function emptyEvent(): EventFormValues {
  return {
    slug: "",
    title: "",
    description: "",
    starts_at: "",
    ends_at: null,
    venue_name: "",
    address: "",
    cover_image_url: null,
    sales_start_at: null,
    sales_end_at: null,
    max_tickets: null,
    is_active: true,
  };
}

function newRow(partial?: Partial<DraftRow>): DraftRow {
  return {
    key: crypto.randomUUID(),
    name: "",
    price: "",
    quantity: "",
    description: "",
    ...partial,
  };
}

function parsePrice(value: string): number {
  return Number(value.replace(/\s/g, "").replace(",", "."));
}

export function EventForm({
  initial,
  busy,
  withTicketTypes = false,
  onSubmit,
}: {
  initial: EventFormValues;
  busy: boolean;
  withTicketTypes?: boolean;
  onSubmit: (values: EventFormValues, ticketTypes: TicketTypeDraft[]) => void;
}) {
  const [values, setValues] = useState<EventFormValues>(initial);
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>(() => (withTicketTypes ? [newRow()] : []));

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setRow(key: string, patch: Partial<DraftRow>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function move(key: string, delta: number) {
    setRows((r) => {
      const index = r.findIndex((row) => row.key === key);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= r.length) return r;
      const copy = [...r];
      const item = copy.splice(index, 1)[0];
      if (!item) return r;
      copy.splice(target, 0, item);
      return copy;
    });
  }

  const summary = useMemo(() => {
    let quota = 0;
    let revenue = 0;
    let hasPaid = false;
    for (const row of rows) {
      const price = parsePrice(row.price);
      const quantity = Number(row.quantity);
      if (!Number.isNaN(quantity) && row.quantity !== "") quota += quantity;
      if (!Number.isNaN(price) && row.price !== "" && !Number.isNaN(quantity)) {
        revenue += Math.round(price * 100) * (quantity || 0);
        if (price > 0) hasPaid = true;
      }
    }
    return { quota, revenue, hasPaid };
  }, [rows]);

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("event-images").upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data, error: signError } = await supabase.storage
        .from("event-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signError) throw signError;
      set("cover_image_url", data.signedUrl);
      toast.success("Bild hochgeladen.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!values.title.trim() || !values.starts_at) {
          toast.error("Titel und Startzeitpunkt sind Pflichtfelder.");
          return;
        }

        let types: TicketTypeDraft[] = [];
        if (withTicketTypes) {
          const filled = rows.filter(
            (r) => r.name.trim() || r.price.trim() || r.quantity.trim(),
          );
          if (filled.length === 0) {
            toast.error("Lege mindestens eine Ticketart mit Preis und Kontingent an.");
            return;
          }
          for (const row of filled) {
            const price = parsePrice(row.price);
            const quantity = Number(row.quantity);
            if (!row.name.trim()) {
              toast.error("Jede Ticketart braucht einen Namen.");
              return;
            }
            if (Number.isNaN(price) || price < 0) {
              toast.error(`Preis von „${row.name}“ ist keine gültige Zahl.`);
              return;
            }
            if (!Number.isInteger(quantity) || quantity < 1) {
              toast.error(`Kontingent von „${row.name}“ muss mindestens 1 sein.`);
              return;
            }
            types.push({
              name: row.name.trim(),
              description: row.description.trim() ? row.description.trim() : null,
              price_cents: Math.round(price * 100),
              quantity,
            });
          }
          if (!types.some((t) => t.price_cents > 0)) {
            toast.error("Mindestens eine Ticketart muss einen Preis über 0 € haben.");
            return;
          }
          const tooCheap = types.find((t) => t.price_cents > 0 && t.price_cents < 50);
          if (tooCheap) {
            toast.error(`„${tooCheap.name}“ muss mindestens 0,50 € kosten.`);
            return;
          }
        }

        onSubmit(
          {
            ...values,
            slug: values.slug || slugify(values.title),
            description: values.description?.trim() ? values.description : null,
            venue_name: values.venue_name?.trim() ? values.venue_name : null,
            address: values.address?.trim() ? values.address : null,
          },
          types,
        );
      }}
    >
      <section className="space-y-4">
        <SectionTitle
          title="Veranstaltung"
          hint="Diese Angaben sehen Besucher auf der öffentlichen Event-Seite."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Eventname" className="sm:col-span-2">
            <Input
              value={values.title}
              required
              maxLength={140}
              onChange={(e) => {
                const title = e.target.value;
                setValues((v) => ({
                  ...v,
                  title,
                  slug: v.id ? v.slug : slugify(title),
                }));
              }}
              placeholder="Sommerfest 2026"
            />
          </Field>

          <Field label="URL-Kürzel (Slug)" hint={`Öffentliche Seite: /event/${values.slug || "…"}`}>
            <Input
              value={values.slug}
              required
              onChange={(e) => set("slug", slugify(e.target.value))}
              placeholder="sommerfest-2026"
            />
          </Field>

          <Field
            label="Maximale Tickets (optional)"
            hint="Obergrenze über alle Ticketarten hinweg."
          >
            <Input
              type="number"
              min={0}
              value={values.max_tickets ?? ""}
              onChange={(e) =>
                set("max_tickets", e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder="z. B. 200"
            />
          </Field>

          <Field label="Beschreibung" className="sm:col-span-2">
            <Textarea
              value={values.description ?? ""}
              rows={5}
              maxLength={5000}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Worum geht es bei dieser Veranstaltung?"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle title="Zeit & Ort" hint="Zeiten gelten in deutscher Zeit (Europe/Berlin)." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Beginn">
            <Input
              type="datetime-local"
              required
              value={toLocalInputValue(values.starts_at)}
              onChange={(e) => set("starts_at", fromLocalInputValue(e.target.value) ?? "")}
            />
          </Field>

          <Field label="Ende (optional)">
            <Input
              type="datetime-local"
              value={toLocalInputValue(values.ends_at)}
              onChange={(e) => set("ends_at", fromLocalInputValue(e.target.value))}
            />
          </Field>

          <Field label="Verkaufsstart (optional)">
            <Input
              type="datetime-local"
              value={toLocalInputValue(values.sales_start_at)}
              onChange={(e) => set("sales_start_at", fromLocalInputValue(e.target.value))}
            />
          </Field>

          <Field label="Verkaufsende (optional)">
            <Input
              type="datetime-local"
              value={toLocalInputValue(values.sales_end_at)}
              onChange={(e) => set("sales_end_at", fromLocalInputValue(e.target.value))}
            />
          </Field>

          <Field label="Ort">
            <Input
              value={values.venue_name ?? ""}
              onChange={(e) => set("venue_name", e.target.value)}
              placeholder="Stadthalle"
            />
          </Field>

          <Field label="Adresse">
            <Input
              value={values.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Musterstraße 1, 12345 Musterstadt"
            />
          </Field>

          <Field label="Coverbild" className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <label className="cursor-pointer">
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Bild auswählen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadCover(file);
                    }}
                  />
                </label>
              </Button>
              {values.cover_image_url && (
                <>
                  <img
                    src={values.cover_image_url}
                    alt="Coverbild-Vorschau"
                    className="h-16 w-28 rounded-lg object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => set("cover_image_url", null)}
                  >
                    Entfernen
                  </Button>
                </>
              )}
            </div>
          </Field>
        </div>
      </section>

      {withTicketTypes && (
        <section className="space-y-4">
          <SectionTitle
            title="Ticketarten & Preise"
            hint="Diese Preise werden beim Bezahlen automatisch übernommen."
          />

          <div className="space-y-3">
            {rows.map((row, index) => {
              const price = parsePrice(row.price);
              const cents = Number.isNaN(price) ? 0 : Math.round(price * 100);
              return (
                <div
                  key={row.key}
                  className="rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input
                        value={row.name}
                        onChange={(e) => setRow(row.key, { name: e.target.value })}
                        placeholder="Standard"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Preis (€)</Label>
                      <Input
                        value={row.price}
                        inputMode="decimal"
                        onChange={(e) => setRow(row.key, { price: e.target.value })}
                        placeholder="19,90"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Kontingent</Label>
                      <Input
                        value={row.quantity}
                        inputMode="numeric"
                        onChange={(e) => setRow(row.key, { quantity: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Nach oben"
                        disabled={index === 0}
                        onClick={() => move(row.key, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Nach unten"
                        disabled={index === rows.length - 1}
                        onClick={() => move(row.key, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Ticketart entfernen"
                        onClick={() =>
                          setRows((r) =>
                            r.length === 1 ? [newRow()] : r.filter((x) => x.key !== row.key),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <Input
                    className="mt-3"
                    value={row.description}
                    maxLength={500}
                    onChange={(e) => setRow(row.key, { description: e.target.value })}
                    placeholder="Kurzbeschreibung (optional), z. B. „Eintritt inkl. Getränk“"
                  />

                  <p className="mt-2 text-xs text-muted-foreground">
                    Im Bezahlfenster:{" "}
                    <span className="font-500 text-foreground">
                      {(values.title || "Eventname") + " — " + (row.name || "Ticketart")}
                    </span>
                    {cents > 0 && cents < 50 && (
                      <span className="ml-2 text-destructive">
                        Beträge unter 0,50 € können nicht online bezahlt werden.
                      </span>
                    )}
                    {cents === 0 && row.price.trim() !== "" && (
                      <span className="ml-2 text-warning">
                        Gratis-Ticket — nur zusammen mit einer bezahlten Ticketart buchbar.
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setRows((r) => [...r, newRow()])}>
              <Plus className="size-4" /> Ticketart hinzufügen
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setRows([
                  newRow({ name: "Early Bird", price: "15,00", quantity: "50" }),
                  newRow({ name: "Standard", price: "22,00", quantity: "200" }),
                  newRow({ name: "VIP", price: "45,00", quantity: "30" }),
                ])
              }
            >
              <Sparkles className="size-4" /> Vorschlag einsetzen
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p>
              Gesamtkontingent: <span className="font-600">{summary.quota}</span> Tickets · Möglicher
              Umsatz: <span className="font-600">{formatMoney(summary.revenue)}</span>
            </p>
            {values.max_tickets != null && summary.quota > values.max_tickets && (
              <p className="mt-1 text-warning">
                Die Ticketarten ergeben mehr Plätze ({summary.quota}) als die maximale Ticketzahl (
                {values.max_tickets}). Der Verkauf stoppt bei {values.max_tickets}.
              </p>
            )}
            {!summary.hasPaid && (
              <p className="mt-1 text-muted-foreground">
                Noch keine bezahlte Ticketart — mindestens eine Ticketart braucht einen Preis.
              </p>
            )}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
        <div>
          <p className="text-sm font-600">Event öffentlich sichtbar</p>
          <p className="text-xs text-muted-foreground">
            Inaktive Events sind auf der Website nicht erreichbar.
          </p>
        </div>
        <Switch checked={values.is_active} onCheckedChange={(v) => set("is_active", v)} />
      </div>

      <Button type="submit" size="lg" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        Speichern
      </Button>
    </form>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border-b border-border pb-2">
      <h2 className="font-display text-lg font-700">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
