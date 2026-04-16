import { Injectable } from "@nestjs/common";
import { Eventra } from "@eventra_dev/eventra-sdk";

@Injectable()
export class TrackerService {
  private tracker = new Eventra({
    apiKey: "test",
    // Optional: override the default API endpoint (useful for local development or self-hosted servers)
    endpoint: "http://localhost:4000/track",
  });

  track(name: string, data: any = {}) {
    try {
      this.tracker.track(name, {
        userId: "nestjs_user",
        ...data
      })
    } catch {}
  }
}
