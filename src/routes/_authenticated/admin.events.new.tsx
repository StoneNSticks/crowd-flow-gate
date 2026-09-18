import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { adminSaveEvent } from "@/lib/admin.functions";
import { EventForm, emptyEvent, type EventFormValues } from "@/components/admin/EventForm";

export const Route = createFileRoute("/_authenticated/admin/events/new")({
  component: NewEventPage,
});

function NewEventPage() {
  const saveEvent = useServerFn(adminSaveEvent);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: EventFormValues) => saveEvent({ data: values }),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Event angelegt. Jetzt Ticketkategorien ergänzen.");
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
        Ticketkategorien und Preise legst du im nächsten Schritt fest.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-7">
        <EventForm
          initial={emptyEvent()}
          busy={mutation.isPending}
          onSubmit={(values) => mutation.mutate(values)}
        />
      </div>
    </div>
  );
}
