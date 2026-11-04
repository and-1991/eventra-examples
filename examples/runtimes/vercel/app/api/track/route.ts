import { Eventra } from "@eventra_dev/eventra-sdk";

export const runtime = "edge";

const tracker = new Eventra({
  apiKey: process.env.EVENTRA_API_KEY ?? "test", // mock key for the local mock server — set EVENTRA_API_KEY
  // Optional: override the default API endpoint (useful for local development or self-hosted servers)
  endpoint: "http://localhost:4000/track",
});

export async function GET(request: Request) {
  try {
    tracker.track("vercel_request", {
      path: new URL(request.url).pathname
    })
  } catch {}

  tracker.track("vercel_api_hit")

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" }
  });
}
