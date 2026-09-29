/**
 * Form payment service (Issue #552).
 */

export type {
  CardBrand,
  CardDetails,
  CardValidationResult,
  CreatePaymentIntentRequest,
  FormPaymentConfig,
  PaymentAmount,
  PaymentCurrency,
  PaymentIntentResult,
  PaymentStatus,
  ProcessPaymentRequest,
  ProcessPaymentResult,
} from "./types";

export { DEFAULT_PAYMENT_CONFIG } from "./types";

export {
  detectCardBrand,
  formatCardNumber,
  luhnCheck,
  mapPaymentError,
  validateCardDetails,
} from "./card-validation";

export {
  confirmPayment,
  createPaymentIntent,
  loadStripeJs,
  processCardPayment,
  resetStripeLoader,
} from "./stripe";
