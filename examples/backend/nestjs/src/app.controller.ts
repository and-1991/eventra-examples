import { Controller, Get } from "@nestjs/common";
import { TrackerService } from "./tracker/tracker.service";

@Controller()
export class AppController {
  constructor(private readonly tracker: TrackerService) {}

  @Get()
  async getHello() {
    await this.tracker.track("nestjs_request");
    return "OK";
  }
}
