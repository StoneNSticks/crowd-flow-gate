import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe } from "@/lib/stripe";

interface CheckoutDialogProps {
  clientSecret: string | null;
  onClose: () => void;
}

export function CheckoutDialog({ clientSecret, onClose }: CheckoutDialogProps) {
  return (
    <Dialog open={Boolean(clientSecret)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="font-display">Bezahlung</DialogTitle>
        </DialogHeader>
        <div className="px-3 py-4 sm:px-5">
          {clientSecret && (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
