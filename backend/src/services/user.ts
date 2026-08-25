import type { FastifyRequest } from "fastify";
import { prisma } from "../db/client";
import { notifyAdmin } from "./adminAlerts";
import { requireSubscription } from "./subscriptionGate";
import type { ResolvedUser } from "../types";

const DEV_FALLBACK_USER_ID = "dev-user";

interface TelegramInitDataUser {
  id?: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

// Extracts the Telegram user object from the raw initData string without
// verifying its HMAC signature against the bot token. Telegram Mini Apps are
// expected to send a cryptographically signed initData payload, and a real
// deployment MUST verify that signature server-side before trusting the
// contained user id — skipping it means a client could forge any
// telegramId. This is a known, intentional simplification for the MVP.
function extractTelegramUserFromInitData(initData: string): TelegramInitDataUser | null {
  try {
    const params = new URLSearchParams(initData);
    const userJson = params.get("user");
    if (!userJson) return null;
    return JSON.parse(userJson) as TelegramInitDataUser;
  } catch {
    return null;
  }
}

function resolveTelegramInitUser(request: FastifyRequest): TelegramInitDataUser | null {
  const initData = request.headers["x-telegram-init-data"];
  if (typeof initData !== "string" || initData.length === 0) return null;
  return extractTelegramUserFromInitData(initData);
}

function resolveTelegramKey(request: FastifyRequest, initUser: TelegramInitDataUser | null): string {
  if (initUser?.id !== undefined && initUser.id !== null) {
    return `tg:${initUser.id}`;
  }

  const devUserHeader = request.headers["x-dev-user-id"];
  if (typeof devUserHeader === "string" && devUserHeader.length > 0) {
    return `dev:${devUserHeader}`;
  }

  return `dev:${DEV_FALLBACK_USER_ID}`;
}

// Human-readable label for admin alerts and logs: @username, else full name,
// else the internal key (e.g. "dev:gatecheck") as a last resort.
function resolveDisplayName(initUser: TelegramInitDataUser | null, telegramKey: string): string {
  if (initUser?.username) return `@${initUser.username}`;
  const fullName = [initUser?.first_name, initUser?.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  return telegramKey;
}

export async function resolveUser(request: FastifyRequest): Promise<ResolvedUser> {
  const initUser = resolveTelegramInitUser(request);
  const telegramKey = resolveTelegramKey(request, initUser);
  const displayName = resolveDisplayName(initUser, telegramKey);

  await requireSubscription(telegramKey);

  const existing = await prisma.user.findUnique({ where: { telegramId: telegramKey } });
  if (existing) {
    return { id: existing.id, telegramId: existing.telegramId, displayName, isNew: false };
  }

  try {
    const user = await prisma.user.create({ data: { telegramId: telegramKey } });
    notifyAdmin(`🆕 Новый пользователь Feetrate\n${displayName}`).catch(() => {});
    return { id: user.id, telegramId: user.telegramId, displayName, isNew: true };
  } catch {
    // Lost a create race against a concurrent request for the same new user.
    const user = await prisma.user.findUniqueOrThrow({ where: { telegramId: telegramKey } });
    return { id: user.id, telegramId: user.telegramId, displayName, isNew: false };
  }
}
