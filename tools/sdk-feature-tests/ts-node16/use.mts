import { Eventra, type TrackOptions } from "@eventra_dev/eventra-sdk";
const o: TrackOptions = { userId: 7 };
new Eventra({ apiKey: "k" }).track("z", o);
