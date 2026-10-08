"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { EVENTS } from "../lib/events";

const PLANS = [
  { id: "starter", price: 0 },
  { id: "pro", price: 29 },
];

export function PricingCards() {
  const posthog = usePostHog();

  useEffect(() => {
    posthog.capture(EVENTS.pricingViewed);
  }, [posthog]);

  async function checkout(plan: string) {
    posthog.capture(EVENTS.planSelected, { plan });
    await fetch("/api/checkout", { method: "POST", body: JSON.stringify({ plan }) });
    posthog.capture(EVENTS.checkoutCompleted, { plan });
  }

  return (
    <section>
      {PLANS.map((plan) => (
        <button key={plan.id} onClick={() => checkout(plan.id)}>
          {plan.id} - ${plan.price}
        </button>
      ))}
    </section>
  );
}
