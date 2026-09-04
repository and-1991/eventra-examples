import { useEffect } from "react";
import { trackReactClick, trackReactPageView } from "./events";

const REACT_JSX_DYNAMIC_ATTR_EVENT = "react_jsx_dynamic_attr_click";

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

      <button event="react_jsx_attr_click">Native JSX event attribute</button>
      <button event={REACT_JSX_DYNAMIC_ATTR_EVENT}>Dynamic JSX event attribute</button>
      <button event={`react_jsx_template_${1}`}>Unresolvable JSX event attribute</button>
    </main>
  );
}
