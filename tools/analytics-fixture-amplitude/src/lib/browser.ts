import * as amplitude from "@amplitude/analytics-browser";

amplitude.init("test", undefined, { serverUrl: "http://localhost:4000" });

export function trackBrowserLoaded() {
  amplitude.track("amplitude_browser_loaded");
  amplitude.track("amplitude_with_props", { plan: "pro" });
}

// Object form: { event_type }
export function trackObjectForm() {
  amplitude.track({ event_type: "amplitude_object_form", event_properties: { a: 1 } });
}

// Not events: names with disallowed characters are excluded
export function trackExcluded() {
  amplitude.track("bad name!");
}
