import * as amplitude from "@amplitude/analytics-node";

amplitude.init(process.env.AMPLITUDE_API_KEY ?? "test", {
  serverUrl: "http://localhost:4000/amplitude",
  flushQueueSize: 1,
});

// Thin wrapper: routes pass event names from lib/events.ts
export function trackEvent(userId: string, name: string, properties?: Record<string, unknown>) {
  return amplitude.track(name, properties, { user_id: userId });
}

export async function shutdownAnalytics() {
  await amplitude.flush().promise;
}
