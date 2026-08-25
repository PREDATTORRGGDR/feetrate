import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db/client";
import { notifyAdmin } from "../services/adminAlerts";
import { analyzeFootPhoto } from "../services/geminiService";
import { checkPhotoQuality } from "../services/photoQuality";
import { computeFootScore } from "../services/scoring";
import { resolveUser } from "../services/user";
import type { FootMetrics, MetricKey } from "../types";

const METRIC_LABELS: Record<MetricKey, string> = {
  smoothness: "Гладкость",
  hydration: "Увлажнённость",
  pinkness: "Розовина",
  overallAppearance: "Общий вид",
};

const WEAKNESS_SUMMARIES: Record<MetricKey, string> = {
  smoothness: "Главный фактор — заметная шероховатость кожи.",
  hydration: "Главный фактор — визуальная сухость кожи.",
  pinkness: "Главный фактор — неровный тон кожи.",
  overallAppearance: "Главный фактор — общий визуальный вид стоп.",
};

const GUIDE_SLUG_BY_METRIC: Record<"smoothness" | "hydration" | "pinkness", string> = {
  smoothness: "smoothness",
  hydration: "hydration",
  pinkness: "tone",
};

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function pickExtreme(metrics: FootMetrics, mode: "max" | "min"): MetricKey {
  const entries = Object.entries(metrics) as [MetricKey, number][];
  return entries.reduce((best, current) => {
    if (mode === "max") {
      return current[1] > best[1] ? current : best;
    }
    return current[1] < best[1] ? current : best;
  })[0];
}

function resolveRecommendedGuideSlug(weaknessKey: MetricKey, metrics: FootMetrics): string {
  if (weaknessKey !== "overallAppearance") {
    return GUIDE_SLUG_BY_METRIC[weaknessKey as "smoothness" | "hydration" | "pinkness"];
  }

  const fallbackKeys: ("smoothness" | "hydration" | "pinkness")[] = [
    "smoothness",
    "hydration",
    "pinkness",
  ];
  const lowestFallback = fallbackKeys.reduce((best, current) =>
    metrics[current] < metrics[best] ? current : best
  );
  return GUIDE_SLUG_BY_METRIC[lowestFallback];
}

export default async function analyzeRoutes(app: FastifyInstance) {
  app.post("/api/analyze", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "no_file", message: "Файл не передан" });
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return reply
        .code(422)
        .send({ error: "low_quality", message: "Не удалось нормально оценить фото" });
    }

    const buffer = await file.toBuffer();

    const preCheck = await checkPhotoQuality(buffer);
    if (!preCheck.ok) {
      return reply
        .code(422)
        .send({ error: "low_quality", message: "Не удалось нормально оценить фото" });
    }

    let result;
    try {
      result = await analyzeFootPhoto(buffer, file.mimetype);
    } catch (err) {
      app.log.error(err, "Gemini analysis failed");
      return reply
        .code(422)
        .send({ error: "low_quality", message: "Не удалось нормально оценить фото" });
    }

    if (!result.qualityOk) {
      return reply
        .code(422)
        .send({ error: "low_quality", message: "Не удалось нормально оценить фото" });
    }

    const metrics: FootMetrics = {
      smoothness: result.smoothness,
      hydration: result.hydration,
      pinkness: result.pinkness,
      overallAppearance: result.overallAppearance,
    };

    const score = computeFootScore(metrics);

    const strengthKey = pickExtreme(metrics, "max");
    const weaknessKey = pickExtreme(metrics, "min");
    const recommendedGuideSlug = resolveRecommendedGuideSlug(weaknessKey, metrics);

    const user = await resolveUser(request);

    const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
    const analysesDir = path.join(uploadsDir, "analyses");
    await mkdir(analysesDir, { recursive: true });

    const extension = file.mimetype === "image/png" ? "png" : file.mimetype === "image/webp" ? "webp" : "jpg";
    const analysisId = randomUUID();
    const fileName = `${analysisId}.${extension}`;
    const filePath = path.join(analysesDir, fileName);
    await writeFile(filePath, buffer);
    const relativePhotoPath = `analyses/${fileName}`;

    const analysis = await prisma.analysis.create({
      data: {
        id: analysisId,
        userId: user.id,
        smoothness: metrics.smoothness,
        hydration: metrics.hydration,
        pinkness: metrics.pinkness,
        overallAppearance: metrics.overallAppearance,
        score,
        photoPath: relativePhotoPath,
      },
    });

    notifyAdmin(
      `📸 Новый анализ Feetrate\n${user.displayName}\nFoot Score: <b>${score}/100</b>`
    ).catch(() => {});

    return {
      id: analysis.id,
      score,
      metrics,
      strength: {
        key: strengthKey,
        label: METRIC_LABELS[strengthKey],
        value: metrics[strengthKey],
      },
      weakness: {
        key: weaknessKey,
        label: METRIC_LABELS[weaknessKey],
        value: metrics[weaknessKey],
        summary: WEAKNESS_SUMMARIES[weaknessKey],
      },
      recommendedGuideSlug,
      createdAt: analysis.createdAt.toISOString(),
    };
  });
}
