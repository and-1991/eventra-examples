import { Eventra } from "@eventra_dev/eventra-sdk";

export const tracker = new Eventra({
  apiKey: "test",
});

export function trackFeature(name: string, data: any = {}) {
  tracker.track(name, data).catch(() => {});
}
