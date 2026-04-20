import { useEffect } from "react";
import { trackFeature } from "./tracker";

export default function App() {
  useEffect(() => {
    console.log("DOM ready");
    trackFeature("react_page_view");
  }, []);

  const handleClick = () => {
    trackFeature("react_click");
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>React Eventra</h1>

      <button onClick={handleClick}>
        Click me
      </button>
    </main>
  );
}
