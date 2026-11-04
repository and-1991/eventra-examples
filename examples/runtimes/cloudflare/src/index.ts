import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({
  apiKey: (globalThis as any).process?.env?.EVENTRA_API_KEY ?? "test", // mock key for the local mock server — set EVENTRA_API_KEY (or a Workers secret)
  // Optional: override the default API endpoint (useful for local development or self-hosted servers)
  endpoint: "http://localhost:4000/track",
});

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      tracker.track("cloudflare_request", {
        userId: "cf_user"
      });

      return new Response("OK", { status: 200 });
    } catch (e) {
      return new Response("Error", { status: 500 });
    }
  }
};
