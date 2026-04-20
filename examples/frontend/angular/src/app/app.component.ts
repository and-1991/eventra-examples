import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({
  apiKey: "test",
  // Optional: override the default API endpoint (useful for local development or self-hosted servers)
  endpoint: "http://localhost:4000/track",
});

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule],
  template: `
    <main style="padding:40px">
      <h1>Angular (CLI) Eventra</h1>

      <button (click)="handleClick()">
        Click me
      </button>
    </main>
  `,
})
export class AppComponent {
  constructor() {
    console.log("App mounted");
    tracker.track("angular_page_view");
  }

  handleClick() {
    console.log("clicked");
    tracker.track("angular_click");
  }
}
