import { analytics } from "../lib/browser";

export function UpgradeButton() {
  return <button onClick={() => analytics.track("segment_upgrade_click")}>Upgrade</button>;
}

// JSX component props: `event` flows into track() inside the component
export function TrackedButton({ event, label }: { event: string; label: string }) {
  return <button onClick={() => analytics.track(event)}>{label}</button>;
}

export function Toolbar() {
  return (
    <>
      <TrackedButton event="segment_toolbar_save" label="Save" />
      <TrackedButton event="segment_toolbar_cancel" label="Cancel" />
    </>
  );
}
