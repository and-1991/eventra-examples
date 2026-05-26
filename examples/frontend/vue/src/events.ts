import { trackFeature } from "./tracker";

export function trackVuePageView() {
  trackFeature("vue_page_view");
}

export function trackVueClick() {
  trackFeature("vue_click");
}
