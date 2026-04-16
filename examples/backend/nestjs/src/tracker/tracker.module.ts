import { Module } from "@nestjs/common";
import { TrackerService } from "./tracker.service";
import { TrackingInterceptor } from "./tracking.interceptor";

@Module({
  providers: [TrackerService, TrackingInterceptor],
  exports: [TrackerService, TrackingInterceptor],
})
export class TrackerModule {}
