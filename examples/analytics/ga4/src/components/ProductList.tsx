import ReactGA from "react-ga4";
import { trackEvent } from "../lib/ga";
import { EVENTS } from "../lib/events";

const PRODUCTS = [
  { id: "p1", name: "T-shirt", price: 20 },
  { id: "p2", name: "Mug", price: 8 },
];

export function ProductList() {
  return (
    <ul>
      {PRODUCTS.map((product) => (
        <li key={product.id}>
          {product.name} - ${product.price}
          <button onClick={() => trackEvent(EVENTS.addToCart, { item_id: product.id, value: product.price })}>
            Add to cart
          </button>
          <button onClick={() => ReactGA.event({ category: "catalog", action: "product_details_opened", label: product.id })}>
            Details
          </button>
        </li>
      ))}
    </ul>
  );
}
