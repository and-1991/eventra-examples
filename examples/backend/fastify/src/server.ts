import { buildApp } from "./app";

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({
      port: Number(process.env.PORT) || 3000
    });

    console.log("Fastify running on http://localhost:3000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
