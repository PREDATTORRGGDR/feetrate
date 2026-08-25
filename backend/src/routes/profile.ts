import type { FastifyInstance } from "fastify";
import { prisma } from "../db/client";
import { resolveUser } from "../services/user";

export default async function profileRoutes(app: FastifyInstance) {
  app.get("/api/profile", async (request) => {
    const user = await resolveUser(request);

    const analyses = await prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { score: true },
    });

    const scoreHistory = analyses.map((a) => a.score);
    const score = scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1] : null;

    const votes = await prisma.vote.findMany({
      where: {
        publicPhoto: {
          analysis: { userId: user.id },
        },
      },
      select: { score: true },
    });

    const publicVotesCount = votes.length;
    const publicRating =
      publicVotesCount >= 3
        ? Math.round((votes.reduce((sum, v) => sum + v.score, 0) / publicVotesCount) * 10) / 10
        : null;

    return {
      score,
      scoreHistory,
      publicRating,
      publicVotesCount,
    };
  });
}
