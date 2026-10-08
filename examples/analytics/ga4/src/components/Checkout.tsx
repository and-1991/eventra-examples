import { trackEvent } from "../lib/ga";
import { EVENTS } from "../lib/events";

export function Checkout() {
  return (
    <section>
      <button onClick={() => trackEvent(EVENTS.beginCheckout)}>Checkout</button>
      <button onClick={() => trackEvent(EVENTS.purchase, { currency: "USD", value: 28 })}>Pay</button>
    </section>
  );
}
