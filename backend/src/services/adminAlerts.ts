const TELEGRAM_API = "https://api.telegram.org";

function isEnabled(): boolean {
  const value = (process.env.ADMIN_NOTIFICATIONS_ENABLED ?? "1").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function adminIds(): string[] {
  const raw = process.env.ADMIN_USER_ID || "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

// Never throws — an admin-alert failure must not break the request it rides on.
export async function notifyAdmin(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !isEnabled()) return;

  const ids = adminIds();
  if (ids.length === 0) return;

  for (const chatId of ids) {
    try {
      const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
      if (!res.ok) {
        console.error("Admin alert failed:", res.status, await res.text());
      }
    } catch (err) {
      console.error("Admin alert error:", err);
    }
  }
}
