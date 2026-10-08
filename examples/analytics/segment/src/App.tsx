import { useEffect } from "react";
import { analytics } from "./lib/analytics";
import { SignupForm } from "./components/SignupForm";
import { Projects } from "./components/Projects";

export function App() {
  useEffect(() => {
    analytics.page(); // page() is not a track event
  }, []);

  return (
    <main>
      <h1>Eventra + Segment</h1>
      <SignupForm />
      <Projects />
    </main>
  );
}
