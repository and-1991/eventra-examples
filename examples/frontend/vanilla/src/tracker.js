import { Eventra } from "@eventra_dev/eventra-sdk";
export const tracker = new Eventra({
    apiKey: import.meta.env?.VITE_EVENTRA_API_KEY ?? "test", // mock key for the local mock server — set VITE_EVENTRA_API_KEY
    endpoint: "http://localhost:4000/track",
});
export function trackFeature(name, data = {}) {
    console.log("TRACK:", name);
    try {
        tracker.track(name, data);
    }
    catch (e) {
        console.error("Track error:", e);
    }
}
