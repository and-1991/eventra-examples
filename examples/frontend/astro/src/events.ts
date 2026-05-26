import { trackFeature } from "./lib/tracker";

export function trackAstroPageView() {
  trackFeature("astro_page_view");
}

export function trackAstroClick() {
  trackFeature("astro_click");
}
