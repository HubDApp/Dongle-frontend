/**
 * Form payment types — Stripe card collection (Issue #552).
 */

export type PaymentCurrency = "usd" | "eur" | "gbp";

export type PaymentStatus =
  | "idle"
  | "validating"
  | "processing"
  | "succeeded"
  | "failed"
  | "requires_action";

export interface CardDetails {
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  name?: string;
  postalCode?: string;
}

export interface CardValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof CardDetails | "card", string>>;
  brand: CardBrand | null;
  last4: string | null;
}

export type CardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "discover"
  | "diners"
  | "jcb"
  | "unionpay"
  | "unknown";

export interface PaymentAmount {
  /** Amount in the smallest currency unit (cents). */
  amount: number;
  currency: PaymentCurrency;
}

export interface CreatePaymentIntentRequest extends PaymentAmount {
  formId: string;
  description?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
}

export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  status: PaymentStatus;
  amount: number;
  currency: PaymentCurrency;
}

export interface ProcessPaymentRequest {
  clientSecret: string;
  /** Stripe PaymentMethod id — never raw card numbers. */
  paymentMethodId: string;
  returnUrl?: string;
}

export interface ProcessPaymentResult {
  status: PaymentStatus;
  paymentIntentId: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface FormPaymentConfig {
  /** Stripe publishable key (pk_...). */
  publishableKey: string;
  /** When true, use Stripe test mode helpers. */
  testMode: boolean;
  /** Require postal code for AVS. */
  requirePostalCode: boolean;
  /** Allowed currencies. */
  currencies: PaymentCurrency[];
}

export const DEFAULT_PAYMENT_CONFIG: FormPaymentConfig = {
  publishableKey: "",
  testMode: true,
  requirePostalCode: false,
  currencies: ["usd", "eur", "gbp"],
};
