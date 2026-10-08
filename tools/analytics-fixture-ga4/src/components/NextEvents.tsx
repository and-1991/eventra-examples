import { sendGAEvent } from "@next/third-parties/google";

// @next/third-parties: sendGAEvent("event", name, params)
export function NextButton() {
  return <button onClick={() => sendGAEvent("event", "ga4_next_click", { value: 1 })}>Next</button>;
}

// JSX component props: `event` flows into sendGAEvent() inside the component
export function TrackedButton({ event, label }: { event: string; label: string }) {
  return <button onClick={() => sendGAEvent("event", event)}>{label}</button>;
}

export function Toolbar() {
  return (
    <>
      <TrackedButton event="ga4_toolbar_save" label="Save" />
      <TrackedButton event="ga4_toolbar_cancel" label="Cancel" />
    </>
  );
}
