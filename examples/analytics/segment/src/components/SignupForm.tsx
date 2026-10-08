import { useState, type FormEvent } from "react";
import { analytics, trackEvent } from "../lib/analytics";
import { EVENTS } from "../lib/events";

export function SignupForm() {
  const [email, setEmail] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    analytics.identify(email, { email });
    trackEvent(EVENTS.signedUp, { method: "email" });
  }

  return (
    <form onSubmit={onSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <button type="submit">Sign up</button>
    </form>
  );
}
