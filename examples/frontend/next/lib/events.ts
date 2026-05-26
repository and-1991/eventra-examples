import { trackFeature } from "./tracker";

export function trackNextPageView() {
  trackFeature("next_page_view");
}

export function trackNextClick() {
  trackFeature("next_click");
}
