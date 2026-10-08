export const SIGNUP = "segment_signup";
export const ORDER_COMPLETED = "Order Completed"; // spaces are allowed

export enum Feature {
  Search = "segment_search",
  Export = "segment_export",
}

export const EVENTS = {
  invoicePaid: "segment_invoice_paid",
  trialStarted: "App: Trial Started", // colon + spaces are allowed
} as const;
