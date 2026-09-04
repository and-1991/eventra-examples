import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { trackAngularClick, trackAngularPageView } from "./events";

const DYNAMIC_CLICK_EVENT = "angular_dynamic_field_click";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./app.component.html",
})
export class AppComponent {
  readonly dynamicClickEvent = DYNAMIC_CLICK_EVENT;
  readonly showConditional = true;
  readonly showLegacy = true;

  readonly items = [
    { label: "For item A", event: "angular_for_item_a_click" },
    { label: "For item B", event: "angular_for_item_b_click" },
  ];

  readonly legacyItems = ["angular_legacy_ngfor_click"];

  readonly dynamicClickEventSignal = signal("angular_signal_click");

  get dynamicClickEventGetter(): string {
    return "angular_dynamic_getter_click";
  }

  constructor() {
    console.log("App mounted");
    trackAngularPageView();
  }

  handleClick() {
    console.log("clicked");
    trackAngularClick();
  }

  resolveClickEventFromMethod(): string {
    return "angular_unresolved_method_click";
  }
}
