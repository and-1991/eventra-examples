import { trackFeature } from "./tracker";

const REACT_CLICK = "react_click";
const REACT_CLICK_ENUM = "react_click_enum";

export function trackReactPageView() {
  trackFeature("react_page_view");
  trackFeature("new_event");
  trackFeature("check_mode");
}

export function trackReactClick() {
  trackFeature(REACT_CLICK);
  trackFeature(REACT_CLICK_ENUM);
}
