// Event names live in one place: constants, enums and objects all resolve statically.
export const SIGNUP = "posthog_signup";
export const CHECKOUT_STARTED = "posthog_checkout_started";

export enum Feature {
  Search = "posthog_search",
  Export = "posthog_export",
}

export const EVENTS = {
  invoicePaid: "posthog_invoice_paid",
  planChanged: "posthog_plan_changed",
} as const;

export const SPACED_NAME = "Posthog: Spaced Name";
