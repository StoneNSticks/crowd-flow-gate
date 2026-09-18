import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { slugify, toLocalInputValue, fromLocalInputValue } from "@/lib/format";

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

export function EventForm({
  initial,
  busy,
  onSubmit,
}: {
  initial: EventFormValues;
  busy: boolean;
  onSubmit: (values: EventFormValues) => void;
}) {
  const [values, setValues] = useState<EventFormValues>(initial);
  const [uploading, setUploading] = useState(false);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

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
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!values.title.trim() || !values.starts_at) {
          toast.error("Titel und Startzeitpunkt sind Pflichtfelder.");
          return;
        }
        onSubmit({
          ...values,
          slug: values.slug || slugify(values.title),
          description: values.description?.trim() ? values.description : null,
          venue_name: values.venue_name?.trim() ? values.venue_name : null,
          address: values.address?.trim() ? values.address : null,
        });
      }}
    >
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

        <Field label="Maximale Tickets (optional)">
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
