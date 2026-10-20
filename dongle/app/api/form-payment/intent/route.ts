/**
 * POST /api/form-payment/intent
 * Creates a Stripe PaymentIntent. The secret key stays server-side so card
 * data is never handled by Dongle application code (Issue #552).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash, randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_CURRENCIES = new Set(["usd", "eur", "gbp"]);

interface IntentBody {
  amount?: number;
  currency?: string;
  formId?: string;
  description?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
}

async function createStripeIntent(params: {
  amount: number;
  currency: string;
  formId: string;
  description?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  secretKey: string;
}): Promise<{ id: string; client_secret: string; status: string }> {
  const body = new URLSearchParams();
  body.set("amount", String(params.amount));
  body.set("currency", params.currency);
  body.set("automatic_payment_methods[enabled]", "true");
  body.set("metadata[formId]", params.formId);
  if (params.description) body.set("description", params.description);
  if (params.customerEmail) body.set("receipt_email", params.customerEmail);
  if (params.metadata) {
    for (const [key, value] of Object.entries(params.metadata)) {
      body.set(`metadata[${key}]`, value);
    }
  }

  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(data.error?.message || "Stripe error"), {
      code: data.error?.code || "stripe_error",
      status: response.status,
    });
  }

  return data;
}

/** Deterministic sandbox intent when STRIPE_SECRET_KEY is unset (local/dev). */
function createSandboxIntent(amount: number, currency: string, formId: string) {
  const id = `pi_test_${createHash("sha256")
    .update(`${formId}:${amount}:${currency}:${Date.now()}`)
    .digest("hex")
    .slice(0, 24)}`;
  return {
    id,
    clientSecret: `${id}_secret_${randomUUID().replace(/-/g, "")}`,
    status: "requires_payment_method" as const,
    amount,
    currency,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as IntentBody;
    const amount = Number(body.amount);
    const currency = String(body.currency || "usd").toLowerCase();
    const formId = String(body.formId || "").trim();

    if (!formId) {
      return NextResponse.json(
        { error: "formId is required", code: "invalid_request" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(amount) || amount < 50) {
      return NextResponse.json(
        {
          error: "amount must be an integer >= 50 (smallest currency unit)",
          code: "invalid_amount",
        },
        { status: 400 },
      );
    }
    if (!ALLOWED_CURRENCIES.has(currency)) {
      return NextResponse.json(
        { error: "Unsupported currency", code: "invalid_currency" },
        { status: 400 },
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY || "";

    if (!secretKey) {
      const sandbox = createSandboxIntent(amount, currency, formId);
      return NextResponse.json({
        id: sandbox.id,
        clientSecret: sandbox.clientSecret,
        status: "processing",
        amount: sandbox.amount,
        currency: sandbox.currency,
        testMode: true,
      });
    }

    const intent = await createStripeIntent({
      amount,
      currency,
      formId,
      description: body.description,
      metadata: body.metadata,
      customerEmail: body.customerEmail,
      secretKey,
    });

    return NextResponse.json({
      id: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status === "succeeded" ? "succeeded" : "processing",
      amount,
      currency,
      testMode: secretKey.startsWith("sk_test"),
    });
  } catch (error) {
    const err = error as { message?: string; code?: string; status?: number };
    return NextResponse.json(
      {
        error: err.message || "Unable to create payment intent",
        code: err.code || "intent_failed",
      },
      { status: err.status && err.status < 500 ? err.status : 502 },
    );
  }
}
