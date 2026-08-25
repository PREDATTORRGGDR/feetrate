import type { FastifyRequest } from "fastify";
import { prisma } from "../db/client";
import { notifyAdmin } from "./adminAlerts";
import { requireSubscription } from "./subscriptionGate";
import type { ResolvedUser } from "../types";

const DEV_FALLBACK_USER_ID = "dev-user";

// Extracts the Telegram numeric user id from the raw initData string without
// verifying its HMAC signature against the bot token. Telegram Mini Apps are
// expected to send a cryptographically signed initData payload, and a real
// deployment MUST verify that signature server-side before trusting the
// contained user id — skipping it means a client could forge any
// telegramId. This is a known, intentional simplification for the MVP.
function extractTelegramIdFromInitData(initData: string): string | null {
  try {
    const params = new URLSearchParams(initData);
    const userJson = params.get("user");
    if (!userJson) return null;
    const parsed = JSON.parse(userJson) as { id?: number | string };
    if (parsed.id === undefined || parsed.id === null) return null;
    return String(parsed.id);
  } catch {
    return null;
  }
}

function resolveTelegramKey(request: FastifyRequest): string {
  const initData = request.headers["x-telegram-init-data"];
  if (typeof initData === "string" && initData.length > 0) {
    const telegramId = extractTelegramIdFromInitData(initData);
    if (telegramId) {
      return `tg:${telegramId}`;
    }
  }

  const devUserHeader = request.headers["x-dev-user-id"];
  if (typeof devUserHeader === "string" && devUserHeader.length > 0) {
    return `dev:${devUserHeader}`;
  }

  return `dev:${DEV_FALLBACK_USER_ID}`;
}

export async function resolveUser(request: FastifyRequest): Promise<ResolvedUser> {
  const telegramKey = resolveTelegramKey(request);

  await requireSubscription(telegramKey);

  const existing = await prisma.user.findUnique({ where: { telegramId: telegramKey } });
  if (existing) {
    return { id: existing.id, telegramId: existing.telegramId, isNew: false };
  }

  try {
    const user = await prisma.user.create({ data: { telegramId: telegramKey } });
    notifyAdmin(`🆕 Новый пользователь Feetrate\nid: <code>${telegramKey}</code>`).catch(() => {});
    return { id: user.id, telegramId: user.telegramId, isNew: true };
  } catch {
    // Lost a create race against a concurrent request for the same new user.
    const user = await prisma.user.findUniqueOrThrow({ where: { telegramId: telegramKey } });
    return { id: user.id, telegramId: user.telegramId, isNew: false };
  }
}
