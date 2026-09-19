import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { adminCreateEventWithTypes } from "@/lib/admin.functions";
import {
  EventForm,
  emptyEvent,
  type EventFormValues,
  type TicketTypeDraft,
} from "@/components/admin/EventForm";

export const Route = createFileRoute("/_authenticated/admin/events/new")({
  component: NewEventPage,
});

function NewEventPage() {
  const createEvent = useServerFn(adminCreateEventWithTypes);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      values,
      ticketTypes,
    }: {
      values: EventFormValues;
      ticketTypes: TicketTypeDraft[];
    }) => {
      const { id: _ignored, ...fields } = values;
      return createEvent({ data: { ...fields, ticketTypes } });
    },
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Event mit Ticketarten angelegt.");
      navigate({ to: "/admin/events/$id", params: { id } });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zurück zur Übersicht
      </Link>
      <h1 className="mt-4 font-display text-3xl font-700">Neues Event</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Veranstaltung und Ticketarten in einem Schritt anlegen — die Preise gelten sofort im
        Kaufvorgang.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-7">
        <EventForm
          initial={emptyEvent()}
          withTicketTypes
          busy={mutation.isPending}
          onSubmit={(values, ticketTypes) => mutation.mutate({ values, ticketTypes })}
        />
      </div>
    </div>
  );
}
