import { Eventra } from "@eventra_dev/eventra-sdk";

export const tracker = new Eventra({ apiKey: "test" });

tracker.track("watch_seq_initial");
