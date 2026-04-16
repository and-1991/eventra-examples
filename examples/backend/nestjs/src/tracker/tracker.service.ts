import { Injectable } from "@nestjs/common";
import { Eventra } from "@eventra_dev/eventra-sdk";

@Injectable()
export class TrackerService {
  private tracker = new Eventra({
    apiKey: "test",
  });

  track(name: string, data: any = {}) {
    this.tracker.track(name, {
      userId: "nestjs_user",
      ...data
    }).catch(() => {});
  }
}
