import { Analytics } from "@segment/analytics-node";
import { EVENTS } from "../events";

const client = new Analytics({ writeKey: "test", host: "http://localhost:4000" });

// analytics-node: track({ userId, event })
export function trackInvoicePaid(userId: string) {
  client.track({ userId, event: EVENTS.invoicePaid });
}

// Typed class field
export class BillingService {
  private readonly segment: Analytics;

  constructor(segment: Analytics) {
    this.segment = segment;
  }

  trialStarted(userId: string) {
    this.segment.track({ userId, event: EVENTS.trialStarted, properties: { source: "api" } });
  }
}

export async function shutdown() {
  await client.closeAndFlush();
}
