import { Injectable, OnModuleInit } from "@nestjs/common";
import { Eventra } from "@eventra_dev/eventra-sdk";

@Injectable()
export class TrackerService implements OnModuleInit {
  private tracker: Eventra;

  onModuleInit() {
    this.tracker = new Eventra({
      apiKey: "test",
    });

    console.log("Eventra initialized");
  }

  async track(name: string) {
    await this.tracker.track(name, {
      userId: "nestjs_user"
    });
  }
}
