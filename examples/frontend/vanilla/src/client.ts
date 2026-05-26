import { trackVanillaClick, trackVanillaPageView } from "./events";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready");
  trackVanillaPageView();

  const btn = document.getElementById("btn");
  if (!btn) {
    console.error("Button not found");
    return;
  }

  btn.addEventListener("click", () => {
    trackVanillaClick();
  });
});
