import { Eventra } from "@eventra_dev/eventra-sdk";

export const tracker = new Eventra({ apiKey: "test" });

export function trackFeature(name: string) {
  tracker.track(name);
}

export function trackPayload(payload: { event: string }) {
  tracker.track(payload.event);
}

export function trackPayloadOptional(payload?: { event: string }) {
  tracker.track(payload?.event as string);
}

export function trackPayloadElement(payload: { event: string }) {
  tracker.track(payload["event"]);
}

export function trackDestructured({ event }: { event: string }) {
  tracker.track(event);
}

export function trackDestructuredAliased({ event: name }: { event: string }) {
  tracker.track(name);
}

export function trackNestedDestructured({
  data: { event },
}: {
  data: { event: string };
}) {
  tracker.track(event);
}
