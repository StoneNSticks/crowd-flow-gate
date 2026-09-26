import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

type CalEvent = {
  title: string;
  slug: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  venue_name?: string | null;
  address?: string | null;
};

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

export function AddToCalendarButton({
  event,
  className,
}: {
  event: CalEvent;
  className?: string;
}) {
  function download() {
    const start = event.starts_at;
    const end = event.ends_at ?? new Date(new Date(start).getTime() + 2 * 3600_000).toISOString();
    const url = `${window.location.origin}/event/${event.slug}`;
    const location = [event.venue_name, event.address].filter(Boolean).join(", ");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//${BRAND_NAME}//DE`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${event.slug}@goethe-connected`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${esc(event.title)}`,
      `DESCRIPTION:${esc([(event.description ?? "").slice(0, 800), url].filter(Boolean).join("\n\n"))}`,
      location ? `LOCATION:${esc(location)}` : "",
      `URL:${url}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${event.slug}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <Button type="button" variant="outline" className={className} onClick={download}>
      <CalendarPlus className="size-4" />
      In Kalender eintragen
    </Button>
  );
}
