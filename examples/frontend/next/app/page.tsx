"use client";

import { useEffect } from "react";
import { trackNextClick, trackNextPageView } from "../lib/events";

export default function Page() {
  useEffect(() => {
    console.log("DOM ready");
    trackNextPageView();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Next Eventra</h1>

      <button onClick={trackNextClick}>
        Click me
      </button>
    </main>
  );
}
