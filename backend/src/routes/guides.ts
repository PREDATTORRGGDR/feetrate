import type { FastifyInstance } from "fastify";
import { getAllGuides, getGuideBySlug } from "../services/guidesContent";
import { resolveUser } from "../services/user";

export default async function guidesRoutes(app: FastifyInstance) {
  app.get("/api/guides", async (request) => {
    await resolveUser(request);
    return getAllGuides().map((g) => ({
      slug: g.slug,
      title: g.title,
      shortDescription: g.shortDescription,
      isPremium: g.isPremium,
    }));
  });

  app.get<{ Params: { slug: string } }>("/api/guides/:slug", async (request, reply) => {
    await resolveUser(request);
    const guide = getGuideBySlug(request.params.slug);
    if (!guide) {
      return reply.code(404).send({ error: "not_found", message: "Гайд не найден" });
    }
    return {
      slug: guide.slug,
      title: guide.title,
      isPremium: guide.isPremium,
      sections: guide.sections,
    };
  });
}
