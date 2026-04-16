import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({
  apiKey: "test",
  // Optional: override the default API endpoint (useful for local development or self-hosted servers)
  endpoint: "http://localhost:4000/track",
});

export default {
  async fetch(request: Request): Promise<Response> {
    // global tracking
    tracker.track("cf_request", {
      path: new URL(request.url).pathname,
      method: request.method
    }).catch(() => {});

    if (new URL(request.url).pathname === "/") {
      // manual tracking
      tracker.track("cf_home").catch(() => {});
      return new Response("OK");
    }

    return new Response("Not Found", { status: 404 });
  }
};
