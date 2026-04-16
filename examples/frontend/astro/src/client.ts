import { trackFeature } from "./lib/tracker";

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready");

  trackFeature("astro_page_view");

  const btn = document.getElementById("btn");

  console.log("btn:", btn);

  if (!btn) {
    console.error("❌ Button not found");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("CLICK WORKS"); // 👈 важно
    trackFeature("astro_click");
  });
});
