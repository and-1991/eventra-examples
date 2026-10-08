import ReactGA from "react-ga4";

ReactGA.initialize("G-TEST");

export function trackReactGa() {
  ReactGA.event("ga4_react_ga_string");
  ReactGA.event({ category: "shop", action: "ga4_react_ga_object" });
}

// Not events: names with disallowed characters are excluded
export function trackExcluded() {
  ReactGA.event("bad name!");
}
