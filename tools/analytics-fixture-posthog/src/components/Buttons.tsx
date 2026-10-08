import { usePostHog } from "posthog-js/react";
import { useAnalytics } from "../hooks";

// usePostHog() under any variable name
export function UpgradeButton() {
  const ph = usePostHog();
  return <button onClick={() => ph.capture("posthog_upgrade_click")}>Upgrade</button>;
}

export function ShareButton() {
  const analytics = useAnalytics();
  return <button onClick={() => analytics.capture("posthog_share_click")}>Share</button>;
}

// JSX component props: `event` flows into capture() inside the component
export function TrackedButton({ event, label }: { event: string; label: string }) {
  const posthog = usePostHog();
  return <button onClick={() => posthog.capture(event)}>{label}</button>;
}

export function Toolbar() {
  return (
    <>
      <TrackedButton event="posthog_toolbar_save" label="Save" />
      <TrackedButton event="posthog_toolbar_cancel" label="Cancel" />
    </>
  );
}
