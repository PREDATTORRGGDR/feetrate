import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// Load .env for local dev (Docker/production inject real env vars directly,
// so a missing .env file here is not an error).
if (typeof process.loadEnvFile === "function" && existsSync(path.join(process.cwd(), ".env"))) {
  process.loadEnvFile();
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import healthRoutes from "./routes/health";
import analyzeRoutes from "./routes/analyze";
import ratingRoutes from "./routes/rating";
import guidesRoutes from "./routes/guides";
import profileRoutes from "./routes/profile";
import { startTelegramBot } from "./services/telegramBot";

async function main() {
  const app = Fastify({ logger: true });

  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || "./uploads");
  await mkdir(uploadsDir, { recursive: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  });

  await app.register(multipart, {
    limits: {
      fileSize: 15 * 1024 * 1024, // 15 MB
    },
  });

  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/",
  });

  await app.register(healthRoutes);
  await app.register(analyzeRoutes);
  await app.register(ratingRoutes);
  await app.register(guidesRoutes);
  await app.register(profileRoutes);

  const port = Number(process.env.PORT) || 8080;
  await app.listen({ port, host: "0.0.0.0" });

  startTelegramBot().catch((err) => console.error("Telegram bot crashed:", err));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
