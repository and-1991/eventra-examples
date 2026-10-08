export const SIGNUP = "amplitude_signup";

export enum Feature {
  Search = "amplitude_search",
  Export = "amplitude_export",
}

export const EVENTS = {
  invoicePaid: "amplitude_invoice_paid",
  trialStarted: "Amplitude: Trial Started", // colon + spaces are allowed
} as const;
