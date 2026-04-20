"use client";

import { useEffect } from "react";
import { trackFeature } from "../lib/tracker";

export default function Page() {
  useEffect(() => {
    console.log("DOM ready");

    trackFeature("next_page_view");
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Next Eventra</h1>

      <button
        onClick={() => {
          trackFeature("next_click");
        }}
      >
        Click me
      </button>
    </main>
  );
}
