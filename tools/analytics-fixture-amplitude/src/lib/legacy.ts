import amplitudeLegacy from "amplitude-js";

// amplitude-js (legacy SDK): logEvent() and getInstance().logEvent()
amplitudeLegacy.getInstance().init("test");

export function trackLegacy() {
  amplitudeLegacy.logEvent("amplitude_legacy_log_event");
  amplitudeLegacy.getInstance().logEvent("amplitude_legacy_instance_event");
}

const client = amplitudeLegacy.getInstance();

// Client under any variable name
export function trackLegacyClient() {
  client.logEvent("amplitude_legacy_client_event");
}
