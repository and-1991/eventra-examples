"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_test", {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "http://localhost:4000",
      capture_pageview: false,
    });
    posthog.capture("$pageview"); // PostHog system event: not collected by eventra
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
