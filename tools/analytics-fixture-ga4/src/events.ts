export const SIGNUP = "ga4_signup";

export enum Feature {
  Search = "ga4_search",
  Export = "ga4_export",
}

export const EVENTS = {
  purchase: "ga4_purchase",
  trialStarted: "GA4: Trial Started", // colon + spaces are allowed
} as const;
