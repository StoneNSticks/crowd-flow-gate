import QRCodeLib from "qrcode";
import type { PublicTicket } from "@/lib/tickets.functions";
import { BRAND_NAME } from "@/lib/brand";
import { formatDateTime, formatPrice } from "@/lib/format";

/** Erzeugt ein druckfertiges A4-PDF des Tickets und startet den Download. */
export async function downloadTicketPdf(ticket: PublicTicket) {
  const { jsPDF } = await import("jspdf");
  const qr = await QRCodeLib.toDataURL(ticket.code, {
    width: 900,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#101426ff", light: "#ffffffff" },
  });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Kopfbereich
  doc.setFillColor(16, 20, 38);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(BRAND_NAME, margin, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Eintrittsticket — bitte am Eingang vorzeigen", margin, 25);

  // Event
  doc.setTextColor(16, 20, 38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(ticket.event.title, contentWidth) as string[];
  let y = 50;
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90, 95, 115);
  doc.text(ticket.ticket_type_name ?? "Ticket", margin, y);
  y += 10;

  // QR-Code
  const qrSize = 62;
  const qrX = (pageWidth - qrSize) / 2;
  doc.setDrawColor(215, 218, 228);
  doc.roundedRect(qrX - 5, y - 5, qrSize + 10, qrSize + 10, 3, 3, "S");
  doc.addImage(qr, "PNG", qrX, y, qrSize, qrSize);
  y += qrSize + 12;

  doc.setFont("courier", "normal");
  doc.setFontSize(12);
  doc.setTextColor(16, 20, 38);
  doc.text(ticket.code, pageWidth / 2, y, { align: "center" });
  y += 12;

  // Details
  const status =
    ticket.status === "valid"
      ? "Gültig"
      : ticket.status === "redeemed"
        ? "Bereits eingelöst"
        : "Storniert";

  const rows: Array<[string, string]> = [
    ["Name", ticket.holder_name],
    ["E-Mail", ticket.holder_email],
    ["Termin", formatDateTime(ticket.event.starts_at)],
  ];
  const place = [ticket.event.venue_name, ticket.event.address].filter(Boolean).join(", ");
  if (place) rows.push(["Ort", place]);
  rows.push(["Preis", ticket.price_cents === 0 ? "Kostenlos" : formatPrice(ticket.price_cents)]);
  rows.push(["Status", status]);
  rows.push(["Ticket-ID", ticket.id]);
  if (ticket.redeemed_at) rows.push(["Eingelöst am", formatDateTime(ticket.redeemed_at)]);

  doc.setFontSize(11);
  for (const [label, value] of rows) {
    doc.setDrawColor(230, 232, 240);
    doc.line(margin, y - 5, pageWidth - margin, y - 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 124, 140);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 20, 38);
    const valueLines = doc.splitTextToSize(value, contentWidth - 45) as string[];
    doc.text(valueLines, pageWidth - margin, y, { align: "right" });
    y += Math.max(9, valueLines.length * 6);
  }

  // Fußnote
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(130, 134, 150);
  const note = doc.splitTextToSize(
    "Dieses Ticket ist personalisiert und nur einmal gültig. Tickets sind vom Umtausch ausgeschlossen: Ein Storno oder eine Rückerstattung ist nach dem Kauf nicht möglich.",
    contentWidth,
  ) as string[];
  doc.text(note, margin, 277 - note.length * 4);

  const fileName = `ticket-${(ticket.ticket_type_name ?? "ticket")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${ticket.id.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
