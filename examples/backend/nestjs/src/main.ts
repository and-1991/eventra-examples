import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { TrackingInterceptor } from "./tracker/tracking.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // GLOBAL TRACKING
  app.useGlobalInterceptors(
    app.get(TrackingInterceptor)
  );

  await app.listen(3000);

  console.log("Nest running on http://localhost:3000");
}

void bootstrap();
