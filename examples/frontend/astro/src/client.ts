import { trackAstroClick, trackAstroPageView } from "./events";

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready");
  trackAstroPageView();

  const btn = document.getElementById("btn");
  console.log("btn:", btn);

  if (!btn) {
    console.error("Button not found");
    return;
  }

  btn.addEventListener("click", () => {
    trackAstroClick();
  });
});
