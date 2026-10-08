import { SIGNUP, CHECKOUT_STARTED } from "../events";
import { track, trackEvent } from "../lib/wrappers";

// Cross-file wrappers + constants
export function onSignup(userId: string) {
  track(SIGNUP, { userId });
}

export function onCheckoutStarted(userId: string) {
  trackEvent({ event: CHECKOUT_STARTED, userId });
}

export function onLogin() {
  track("posthog_login");
}
