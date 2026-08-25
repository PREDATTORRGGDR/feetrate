const TELEGRAM_API = "https://api.telegram.org";
const DEFAULT_REQUIRED_CHANNEL = "@GlowUpXBot";
const SUBSCRIBED_STATUSES = new Set(["creator", "administrator", "member"]);

// Only positive answers are cached, same reasoning as GlowLab's gate: a "no"
// must re-check on the very next request (the user just subscribed and
// pressed "check"), while a "yes" is cheap to trust for a few minutes.
const POSITIVE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { subscribed: boolean; checkedAt: number }>();

export class SubscriptionRequiredError extends Error {
  constructor() {
    super("subscription_required");
    this.name = "SubscriptionRequiredError";
  }
}

function requiredChannelUsername(): string {
  const raw = (process.env.REQUIRED_CHANNEL_USERNAME || DEFAULT_REQUIRED_CHANNEL).trim();
  if (!raw) return DEFAULT_REQUIRED_CHANNEL;
  const stripped = raw.startsWith("https://t.me/") ? raw.split("/").pop()! : raw;
  return stripped.startsWith("@") ? stripped : `@${stripped}`;
}

export function requiredChannelUrl(): string {
  const raw = (process.env.REQUIRED_CHANNEL_URL || "").trim();
  if (raw) return raw;
  return `https://t.me/${requiredChannelUsername().replace(/^@/, "")}`;
}

export function subscriptionGateEnabled(): boolean {
  const value = (process.env.REQUIRED_CHANNEL_ENABLED ?? "1").trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(value);
}

function isAdmin(numericTelegramId: string): boolean {
  const ids = (process.env.ADMIN_USER_ID || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.includes(numericTelegramId);
}

// telegramKey is this app's stable user key: "tg:<numeric id>" for real
// Telegram users, "dev:<anything>" for local/dev-mode testing outside
// Telegram. Dev-mode users always pass -- there is no real Telegram id to
// check membership for, and blocking local development on a channel
// subscription would make the app untestable outside Telegram.
export async function requireSubscription(telegramKey: string): Promise<void> {
  if (!subscriptionGateEnabled()) return;
  if (!telegramKey.startsWith("tg:")) return;

  const numericId = telegramKey.slice(3);
  if (isAdmin(numericId)) return;

  const cached = cache.get(numericId);
  if (cached?.subscribed && Date.now() - cached.checkedAt < POSITIVE_TTL_MS) return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = requiredChannelUsername();
  if (!token || !channel) throw new SubscriptionRequiredError();

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channel, user_id: Number(numericId) }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      result?: { status?: string };
      description?: string;
    };

    if (!data.ok) {
      console.warn("subscription check refused:", data.description);
      throw new SubscriptionRequiredError();
    }

    const status = (data.result?.status || "").toLowerCase();
    const subscribed = SUBSCRIBED_STATUSES.has(status);
    if (subscribed) {
      cache.set(numericId, { subscribed: true, checkedAt: Date.now() });
      return;
    }
    throw new SubscriptionRequiredError();
  } catch (err) {
    if (err instanceof SubscriptionRequiredError) throw err;
    // Telegram unreachable: trust the last known positive answer rather than
    // locking out an already-subscribed user during an outage.
    if (cached?.subscribed) return;
    console.warn("subscription check unreachable:", err);
    throw new SubscriptionRequiredError();
  }
}
