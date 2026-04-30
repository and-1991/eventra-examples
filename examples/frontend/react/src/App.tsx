import { useEffect } from "react";
import { trackFeature } from "./tracker";

const REACT_CLICK = "react_click"
const CLICK = {
  REACT: "react_click_enum"
}

export default function App() {
  useEffect(() => {
    console.log("DOM ready");
    trackFeature("react_page_view");
  }, []);

  const handleClick = () => {
    trackFeature(REACT_CLICK);
    trackFeature(CLICK.REACT);
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
