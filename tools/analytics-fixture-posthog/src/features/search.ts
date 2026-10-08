import { Feature, SPACED_NAME } from "../events";
import { trackNamed, trackArrow } from "../lib/wrappers";

export function onSearch(flag: boolean) {
  trackNamed({ event: Feature.Search });
  trackArrow(flag ? "posthog_search_advanced" : "posthog_search_basic");
  trackArrow(SPACED_NAME);
  trackArrow(`posthog_export_${flag ? "csv" : "json"}`);
}
