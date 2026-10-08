import { analytics, trackEvent } from "../lib/analytics";
import { EVENTS } from "../lib/events";

export function Projects() {
  return (
    <section>
      <button onClick={() => trackEvent(EVENTS.projectCreated, { template: "blank" })}>New project</button>
      <button onClick={() => trackEvent(EVENTS.inviteSent)}>Invite teammate</button>
      <button onClick={() => analytics.track("Docs Opened")}>Docs</button>
    </section>
  );
}
