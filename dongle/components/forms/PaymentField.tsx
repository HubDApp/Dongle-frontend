"use client";

/**
 * Form payment field with Stripe-backed card collection (Issue #552).
 */

import React, { useMemo, useState } from "react";
import { CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  formatCardNumber,
  processCardPayment,
  validateCardDetails,
  type FormPaymentConfig,
  type PaymentCurrency,
  type ProcessPaymentResult,
} from "@/services/form-payment";

export interface PaymentFieldProps {
  formId: string;
  amount: number;
  currency?: PaymentCurrency;
  description?: string;
  config?: Partial<FormPaymentConfig>;
  onSuccess?: (result: ProcessPaymentResult) => void;
  onError?: (result: ProcessPaymentResult) => void;
  className?: string;
}

export function PaymentField({
  formId,
  amount,
  currency = "usd",
  description,
  config,
  onSuccess,
  onError,
  className = "",
}: PaymentFieldProps) {
  const [number, setNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProcessPaymentResult | null>(null);

  const validation = useMemo(
    () =>
      validateCardDetails(
        { number, expMonth, expYear, cvc, name, postalCode },
        config,
      ),
    [number, expMonth, expYear, cvc, name, postalCode, config],
  );

  const displayAmount = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount / 100);
    } catch {
      return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
    }
  }, [amount, currency]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);

    if (!validation.valid) {
      const failed: ProcessPaymentResult = {
        status: "failed",
        paymentIntentId: "",
        errorCode: "card_invalid",
        errorMessage: validation.errors.card || "Card details are invalid",
      };
      setResult(failed);
      onError?.(failed);
      return;
    }

    setBusy(true);
    try {
      const paymentResult = await processCardPayment({
        card: { number, expMonth, expYear, cvc, name, postalCode },
        amount,
        currency,
        formId,
        description,
        config,
      });
      setResult(paymentResult);
      if (paymentResult.status === "succeeded") {
        onSuccess?.(paymentResult);
      } else {
        onError?.(paymentResult);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 ${className}`}
      noValidate
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <CreditCard className="w-4 h-4" aria-hidden />
            Payment
          </h3>
          <p className="text-sm text-zinc-500">Pay {displayAmount}</p>
        </div>
        <p className="text-xs text-zinc-500 flex items-center gap-1">
          <Lock className="w-3 h-3" aria-hidden />
          Secured by Stripe
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="pay-name">
          Name on card
        </label>
        <Input
          id="pay-name"
          autoComplete="cc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="pay-number">
          Card number
        </label>
        <Input
          id="pay-number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          value={formatCardNumber(number)}
          onChange={(e) => setNumber(e.target.value)}
          aria-invalid={Boolean(validation.errors.number)}
        />
        {validation.errors.number && (
          <p className="text-xs text-red-600" role="alert">
            {validation.errors.number}
          </p>
        )}
        {validation.brand && (
          <p className="text-xs text-zinc-500 capitalize">
            {validation.brand}
            {validation.last4 ? ` ······${validation.last4}` : ""}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="pay-exp-month">
            Month
          </label>
          <Input
            id="pay-exp-month"
            inputMode="numeric"
            autoComplete="cc-exp-month"
            placeholder="MM"
            maxLength={2}
            value={expMonth}
            onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
            aria-invalid={Boolean(validation.errors.expMonth)}
          />
          {validation.errors.expMonth && (
            <p className="text-xs text-red-600">{validation.errors.expMonth}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="pay-exp-year">
            Year
          </label>
          <Input
            id="pay-exp-year"
            inputMode="numeric"
            autoComplete="cc-exp-year"
            placeholder="YY"
            maxLength={4}
            value={expYear}
            onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            aria-invalid={Boolean(validation.errors.expYear)}
          />
          {validation.errors.expYear && (
            <p className="text-xs text-red-600">{validation.errors.expYear}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="pay-cvc">
            CVC
          </label>
          <Input
            id="pay-cvc"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            maxLength={4}
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            aria-invalid={Boolean(validation.errors.cvc)}
          />
          {validation.errors.cvc && (
            <p className="text-xs text-red-600">{validation.errors.cvc}</p>
          )}
        </div>
      </div>

      {config?.requirePostalCode && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="pay-postal">
            Postal code
          </label>
          <Input
            id="pay-postal"
            autoComplete="postal-code"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            aria-invalid={Boolean(validation.errors.postalCode)}
          />
          {validation.errors.postalCode && (
            <p className="text-xs text-red-600">{validation.errors.postalCode}</p>
          )}
        </div>
      )}

      <Button type="submit" isLoading={busy} loadingText="Processing…">
        Pay {displayAmount}
      </Button>

      {result?.status === "succeeded" && (
        <p className="text-sm text-emerald-600" role="status">
          Payment successful{result.paymentIntentId ? ` (${result.paymentIntentId})` : ""}.
        </p>
      )}
      {result?.status === "failed" && (
        <p className="text-sm text-red-600" role="alert">
          {result.errorMessage}
        </p>
      )}
      {result?.status === "requires_action" && (
        <p className="text-sm text-amber-600" role="status">
          {result.errorMessage}
        </p>
      )}
    </form>
  );
}

export default PaymentField;
