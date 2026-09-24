ALTER TABLE public.events
ADD COLUMN participation_mode text NOT NULL DEFAULT 'paid';

ALTER TABLE public.events
ADD CONSTRAINT events_participation_mode_check
CHECK (participation_mode IN ('paid', 'free_ticket', 'open_free'));

COMMENT ON COLUMN public.events.participation_mode IS 'Determines whether an event uses paid tickets, free QR tickets, or open attendance without registration.';