import { useEffect } from "react";
import { trackPageView } from "./lib/ga";
import { ProductList } from "./components/ProductList";
import { Checkout } from "./components/Checkout";

export function App() {
  useEffect(() => {
    trackPageView(window.location.pathname);
  }, []);

  return (
    <main>
      <h1>Eventra + GA4</h1>
      <ProductList />
      <Checkout />
    </main>
  );
}
