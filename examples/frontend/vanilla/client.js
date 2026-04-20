import { trackFeature } from "./tracker.js";

// DOM ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready");

  // page view
  trackFeature("vanilla_page_view");

  const btn = document.getElementById("btn");

  if (!btn) {
    console.error("Button not found");
    return;
  }

  btn.addEventListener("click", () => {
    trackFeature("vanilla_click");
  });
});
