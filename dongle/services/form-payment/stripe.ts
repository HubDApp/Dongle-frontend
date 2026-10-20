/**
 * Stripe.js loader and payment processing (Issue #552).
 * Card data is tokenized through Stripe — Dongle APIs only receive
 * PaymentMethod / PaymentIntent identifiers.
 */

import type {
  CreatePaymentIntentRequest,
  FormPaymentConfig,
  PaymentIntentResult,
  ProcessPaymentRequest,
  ProcessPaymentResult,
} from "./types";
import { DEFAULT_PAYMENT_CONFIG } from "./types";
import { mapPaymentError } from "./card-validation";

export interface StripeLike {
  createPaymentMethod: (params: {
    type: "card";
    card: {
      number: string;
      exp_month: number;
      exp_year: number;
      cvc: string;
    };
    billing_details?: {
      name?: string;
      address?: { postal_code?: string };
    };
  }) => Promise<{
    paymentMethod?: { id: string };
    error?: { code?: string; message?: string; type?: string };
  }>;
  confirmCardPayment: (
    clientSecret: string,
    data?: { payment_method: string; return_url?: string },
  ) => Promise<{
    paymentIntent?: { id: string; status: string };
    error?: { code?: string; message?: string; type?: string };
  }>;
}

type StripeFactory = (
  publishableKey: string,
) => Promise<StripeLike | null> | StripeLike | null;

declare global {
  interface Window {
    Stripe?: StripeFactory;
  }
}

let stripePromise: Promise<StripeLike | null> | null = null;

function resolvePublishableKey(config: FormPaymentConfig): string {
  if (config.publishableKey) return config.publishableKey;
  if (typeof process !== "undefined") {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  }
  return "";
}

/** Lazily load Stripe.js from the official CDN for secure transmission. */
export async function loadStripeJs(
  config: Partial<FormPaymentConfig> = {},
): Promise<StripeLike | null> {
  const cfg = { ...DEFAULT_PAYMENT_CONFIG, ...config };
  const key = resolvePublishableKey(cfg);
  if (!key) return null;

  if (typeof window === "undefined") return null;

  if (!stripePromise) {
    stripePromise = (async () => {
      if (!window.Stripe) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://js.stripe.com/v3/";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Failed to load Stripe.js — check network / CSP"));
          document.head.appendChild(script);
        });
      }
      const factory = window.Stripe;
      if (!factory) return null;
      return factory(key);
    })();
  }

  return stripePromise;
}

/** Create a PaymentIntent via the Dongle API (server holds the secret key). */
export async function createPaymentIntent(
  request: CreatePaymentIntentRequest,
): Promise<PaymentIntentResult> {
  const response = await fetch("/api/form-payment/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(body.error || "Unable to start payment"), {
      code: body.code || "intent_failed",
    });
  }

  return body as PaymentIntentResult;
}

/**
 * Tokenize card details with Stripe and confirm the PaymentIntent.
 * Raw card numbers never leave the browser toward Dongle servers.
 */
export async function processCardPayment(options: {
  card: {
    number: string;
    expMonth: string;
    expYear: string;
    cvc: string;
    name?: string;
    postalCode?: string;
  };
  amount: number;
  currency: CreatePaymentIntentRequest["currency"];
  formId: string;
  description?: string;
  config?: Partial<FormPaymentConfig>;
  returnUrl?: string;
}): Promise<ProcessPaymentResult> {
  const cfg = { ...DEFAULT_PAYMENT_CONFIG, ...options.config };

  try {
    const intent = await createPaymentIntent({
      amount: options.amount,
      currency: options.currency,
      formId: options.formId,
      description: options.description,
    });

    const stripe = await loadStripeJs(cfg);
    if (!stripe) {
      // Test / offline path: simulate secure tokenization without Stripe keys.
      if (cfg.testMode) {
        return {
          status: "succeeded",
          paymentIntentId: intent.id,
        };
      }
      return {
        status: "failed",
        paymentIntentId: intent.id,
        errorCode: "stripe_unavailable",
        errorMessage:
          "Stripe is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
      };
    }

    const year =
      options.card.expYear.length === 2
        ? 2000 + Number(options.card.expYear)
        : Number(options.card.expYear);

    const methodResult = await stripe.createPaymentMethod({
      type: "card",
      card: {
        number: options.card.number.replace(/\D/g, ""),
        exp_month: Number(options.card.expMonth),
        exp_year: year,
        cvc: options.card.cvc.replace(/\D/g, ""),
      },
      billing_details: {
        name: options.card.name,
        address: options.card.postalCode
          ? { postal_code: options.card.postalCode }
          : undefined,
      },
    });

    if (methodResult.error || !methodResult.paymentMethod) {
      const mapped = mapPaymentError(methodResult.error);
      return {
        status: "failed",
        paymentIntentId: intent.id,
        errorCode: mapped.code,
        errorMessage: mapped.message,
      };
    }

    return confirmPayment({
      clientSecret: intent.clientSecret,
      paymentMethodId: methodResult.paymentMethod.id,
      returnUrl: options.returnUrl,
    });
  } catch (error) {
    const mapped = mapPaymentError(error);
    return {
      status: "failed",
      paymentIntentId: "",
      errorCode: mapped.code,
      errorMessage: mapped.message,
    };
  }
}

export async function confirmPayment(
  request: ProcessPaymentRequest,
): Promise<ProcessPaymentResult> {
  const stripe = await loadStripeJs();
  if (!stripe) {
    return {
      status: "failed",
      paymentIntentId: "",
      errorCode: "stripe_unavailable",
      errorMessage: "Stripe.js is not available",
    };
  }

  const result = await stripe.confirmCardPayment(request.clientSecret, {
    payment_method: request.paymentMethodId,
    return_url: request.returnUrl,
  });

  if (result.error) {
    const mapped = mapPaymentError(result.error);
    return {
      status: "failed",
      paymentIntentId: result.paymentIntent?.id || "",
      errorCode: mapped.code,
      errorMessage: mapped.message,
    };
  }

  const status = result.paymentIntent?.status;
  if (status === "succeeded") {
    return {
      status: "succeeded",
      paymentIntentId: result.paymentIntent!.id,
    };
  }
  if (status === "requires_action" || status === "requires_confirmation") {
    return {
      status: "requires_action",
      paymentIntentId: result.paymentIntent!.id,
      errorMessage: "Additional authentication is required to finish payment.",
      errorCode: "authentication_required",
    };
  }

  return {
    status: "failed",
    paymentIntentId: result.paymentIntent?.id || "",
    errorCode: "payment_incomplete",
    errorMessage: "Payment did not complete. Please try again.",
  };
}

/** Reset the cached Stripe instance (tests / key rotation). */
export function resetStripeLoader(): void {
  stripePromise = null;
}
