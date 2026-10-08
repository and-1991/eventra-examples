import * as amplitudeNode from "@amplitude/analytics-node";
import { EVENTS } from "../events";

amplitudeNode.init("test");

export function trackInvoicePaid(userId: string) {
  amplitudeNode.track(EVENTS.invoicePaid, undefined, { user_id: userId });
}

export function trackTrialStarted(userId: string) {
  amplitudeNode.track({ event_type: EVENTS.trialStarted, user_id: userId });
}
