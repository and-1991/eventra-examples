import { trackFeature } from "./tracker";

const DYNAMIC_FEATURE = "nuxt_dynamic_feature";

export function trackNuxtPageView() {
  trackFeature("nuxt_page_view");
}

export function trackNuxtClick() {
  trackFeature("nuxt_click");
  trackFeature(DYNAMIC_FEATURE);
}
