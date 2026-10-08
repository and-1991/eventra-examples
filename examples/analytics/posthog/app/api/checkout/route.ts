import { posthogServer } from "../../../lib/posthog-server";

export async function POST(request: Request) {
  const { plan } = (await request.json().catch(() => ({ plan: "unknown" }))) as { plan: string };

  posthogServer.capture({
    distinctId: "anonymous",
    event: "checkout_api_called",
    properties: { plan },
  });
  await posthogServer.flush();

  return Response.json({ ok: true });
}
