import { defineComponent } from "vue";
import { event } from "vue-gtag";

// vue-gtag: event("x")
export function trackVueGtag() {
  event("ga4_vue_gtag_event");
}

// vue-gtag: this.$gtag.event("x") inside a component
export const Checkout = defineComponent({
  methods: {
    pay(this: { $gtag: { event(name: string): void } }) {
      this.$gtag.event("ga4_vue_this_gtag_event");
    },
  },
});
