import { trackFeature } from "./tracker";

export function trackSveltePageView() {
  trackFeature("svelte_page_view");
}

export function trackSvelteClick() {
  trackFeature("svelte_click");
}
