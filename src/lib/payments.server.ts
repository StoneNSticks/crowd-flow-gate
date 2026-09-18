/**
 * Provider adapter for the hosted checkout.
 * Implemented once the payment provider is enabled for this project.
 */
export interface CheckoutLine {
  name: string;
  description: string | null;
  unitAmountCents: number;
  quantity: number;
}

export interface CheckoutRequest {
  orderId: string;
  buyerEmail: string;
  currency: string;
  lines: CheckoutLine[];
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export async function createPaymentSession(_req: CheckoutRequest): Promise<CheckoutSession> {
  throw new Error(
    "Die Bezahlung ist noch nicht aktiviert. Bitte richte den Zahlungsanbieter ein, um Tickets zu verkaufen.",
  );
}
