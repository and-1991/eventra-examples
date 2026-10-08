import { PostHog } from "posthog-node";

export const posthogServer = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_test", {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "http://localhost:4000",
  flushAt: 1,
});
