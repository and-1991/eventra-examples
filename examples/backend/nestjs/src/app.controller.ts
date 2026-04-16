import { Controller, Get } from "@nestjs/common";
import { TrackerService } from "./tracker/tracker.service";

@Controller()
export class AppController {
  constructor(private tracker: TrackerService) {}

  @Get()
  getHello() {
    this.tracker.track("nestjs_home");
    return "OK";
  }

  @Get("/health")
  health() {
    return { status: "ok" };
  }
}
