import { useEffect } from "react";
import { trackReactClick, trackReactPageView } from "./events";

export default function App() {
  useEffect(() => {
    console.log("DOM ready");
    trackReactPageView();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>React Eventra</h1>

      <button onClick={trackReactClick}>
        Click me
      </button>
    </main>
  );
}
