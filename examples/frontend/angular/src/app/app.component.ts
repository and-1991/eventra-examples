import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { trackAngularClick, trackAngularPageView } from "./events";

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
    trackAngularPageView();
  }

  handleClick() {
    console.log("clicked");
    trackAngularClick();
  }
}
