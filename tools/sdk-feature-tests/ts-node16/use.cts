// CommonJS file (.cts) under node16: `import` here compiles to require(), so TypeScript must pick the .d.cts types.
import { Eventra, type TrackOptions } from "@eventra_dev/eventra-sdk";
const opts: TrackOptions = { userId: 42, properties: { a: 1 } };
const t = new Eventra({ apiKey: "k", shutdownTimeoutMs: 1000 });
t.track("x", opts);
void t.shutdown();
// the explicit require form
import sdk = require("@eventra_dev/eventra-sdk");
const t2: sdk.Eventra = new sdk.Eventra({ apiKey: "k" });
t2.track("y", { userId: "s" });
