import { randomUUID } from "node:crypto";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db/client";
import { notifyAdmin } from "../services/adminAlerts";
import { resolveUser } from "../services/user";

function toImageUrl(imagePath: string): string {
  return `/uploads/${imagePath}`;
}

export default async function ratingRoutes(app: FastifyInstance) {
  app.post<{ Body: { analysisId?: string } }>("/api/rating/submit", async (request, reply) => {
    const user = await resolveUser(request);
    const { analysisId } = request.body ?? {};
    if (!analysisId) {
      return reply.code(400).send({ error: "invalid_request", message: "analysisId обязателен" });
    }

    const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } });
    if (!analysis) {
      return reply.code(404).send({ error: "not_found", message: "Анализ не найден" });
    }

    const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
    const publicDir = path.join(uploadsDir, "public");
    await mkdir(publicDir, { recursive: true });

    const extension = path.extname(analysis.photoPath) || ".jpg";
    const publicId = randomUUID();
    const publicFileName = `${publicId}${extension}`;
    const sourcePath = path.join(uploadsDir, analysis.photoPath);
    const destPath = path.join(publicDir, publicFileName);
    await copyFile(sourcePath, destPath);

    const publicPhoto = await prisma.publicPhoto.create({
      data: {
        id: publicId,
        analysisId: analysis.id,
        imagePath: `public/${publicFileName}`,
      },
    });

    notifyAdmin(`📢 Фото опубликовано в общий рейтинг\n${user.displayName}`).catch(() => {});

    return { publicId: publicPhoto.id, status: "published" };
  });

  app.get<{ Querystring: { limit?: string } }>("/api/rating/feed", async (request) => {
    const user = await resolveUser(request);
    const limit = Math.min(Math.max(Number(request.query.limit) || 1, 1), 20);

    // One pass through the shared pool: each photo shows once per user, in
    // random order, then the feed is genuinely empty until someone publishes
    // a new photo — the frontend shows "закончились" instead of looping.
    const pool = await prisma.publicPhoto.findMany({
      where: { votes: { none: { voterUserId: user.id } } },
      include: { votes: { select: { score: true } } },
    });

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const photos = shuffled.slice(0, limit);

    return {
      photos: photos.map((photo) => {
        const voteCount = photo.votes.length;
        const averageScore =
          voteCount >= 3
            ? Math.round((photo.votes.reduce((sum, v) => sum + v.score, 0) / voteCount) * 10) / 10
            : null;
        return {
          publicId: photo.id,
          imageUrl: toImageUrl(photo.imagePath),
          voteCount,
          averageScore,
        };
      }),
    };
  });

  app.get<{ Querystring: { limit?: string } }>("/api/rating/top", async (request) => {
    await resolveUser(request);
    const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 50);

    const photos = await prisma.publicPhoto.findMany({
      include: { votes: { select: { score: true } } },
    });

    const ranked = photos
      .map((photo) => {
        const voteCount = photo.votes.length;
        const averageScore =
          voteCount >= 3
            ? Math.round((photo.votes.reduce((sum, v) => sum + v.score, 0) / voteCount) * 10) / 10
            : null;
        return {
          publicId: photo.id,
          imageUrl: toImageUrl(photo.imagePath),
          voteCount,
          averageScore,
        };
      })
      // Only photos with enough votes for a meaningful average make the leaderboard.
      .filter((photo) => photo.averageScore !== null)
      .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))
      .slice(0, limit);

    return { photos: ranked };
  });

  app.post<{ Body: { publicId?: string; score?: number } }>(
    "/api/rating/vote",
    async (request, reply) => {
      const { publicId, score } = request.body ?? {};
      if (!publicId || typeof score !== "number" || score < 1 || score > 10) {
        return reply
          .code(400)
          .send({ error: "invalid_request", message: "publicId и score (1-10) обязательны" });
      }

      const photo = await prisma.publicPhoto.findUnique({ where: { id: publicId } });
      if (!photo) {
        return reply.code(404).send({ error: "not_found", message: "Фото не найдено" });
      }

      const user = await resolveUser(request);

      await prisma.vote.upsert({
        where: {
          publicPhotoId_voterUserId: {
            publicPhotoId: publicId,
            voterUserId: user.id,
          },
        },
        update: { score: Math.round(score) },
        create: {
          publicPhotoId: publicId,
          voterUserId: user.id,
          score: Math.round(score),
        },
      });

      notifyAdmin(
        `⭐ Новая оценка в Feetrate\n${user.displayName}\nОценка: <b>${Math.round(score)}/10</b>`
      ).catch(() => {});

      return { recorded: true };
    }
  );
}
