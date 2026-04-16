import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({
  apiKey: "test",
  // Optional: override the default API endpoint (useful for local development or self-hosted servers)
  endpoint: "http://localhost:4000/track",
});

console.log("Cloudflare test running...");

tracker.track("cloudflare_test", {
  userId: "cf_user"
});

setTimeout(() => {
  tracker.track("cloudflare_after_timeout");
}, 1000);
