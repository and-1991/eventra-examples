import { trackFeature } from "./tracker";

export function trackVanillaPageView() {
  trackFeature("vanilla_page_view");
}

export function trackVanillaClick() {
  trackFeature("vanilla_click");
}
