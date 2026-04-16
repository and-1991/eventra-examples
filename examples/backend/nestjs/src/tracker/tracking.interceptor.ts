import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { TrackerService } from "./tracker.service";

@Injectable()
export class TrackingInterceptor implements NestInterceptor {
  constructor(private tracker: TrackerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    // request
    this.tracker.track("nestjs_request", {
      path: req.url,
      method: req.method
    });

    return next.handle().pipe(
      tap(() => {
        // response
        this.tracker.track("nestjs_response", {
          statusCode: context.switchToHttp().getResponse().statusCode,
          duration: Date.now() - start
        });
      })
    );
  }
}
