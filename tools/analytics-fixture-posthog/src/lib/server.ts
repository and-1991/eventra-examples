import { PostHog } from "posthog-node";
import { EVENTS } from "../events";

const client = new PostHog("phc_test", { host: "http://localhost:4000" });

// posthog-node: capture({ distinctId, event })
export function trackInvoicePaid(userId: string) {
  client.capture({ distinctId: userId, event: EVENTS.invoicePaid });
}

// Typed class field
export class BillingService {
  private readonly analytics: PostHog;

  constructor(analytics: PostHog) {
    this.analytics = analytics;
  }

  planChanged(userId: string) {
    this.analytics.capture({ distinctId: userId, event: EVENTS.planChanged, properties: { source: "api" } });
  }
}

export async function shutdown() {
  await client.shutdown();
}
