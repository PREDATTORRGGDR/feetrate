const TELEGRAM_API = "https://api.telegram.org";

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
}

async function callTelegram(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram API ${method} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function handleUpdate(token: string, appUrl: string, update: TelegramUpdate) {
  const chatId = update.message?.chat.id;
  const text = update.message?.text;
  if (!chatId || !text) return;

  if (text.startsWith("/start")) {
    await callTelegram(token, "sendMessage", {
      chat_id: chatId,
      text: "Feetrate — узнай рейтинг своих стоп по фото.\n\nЗагрузи фото и получи Foot Score, разбор по параметрам и советы, как его улучшить.",
      reply_markup: {
        inline_keyboard: [[{ text: "Открыть Feetrate", web_app: { url: appUrl } }]],
      },
    });
  }
}

export async function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.FEETRATE_PUBLIC_URL;

  if (!token) {
    console.log("TELEGRAM_BOT_TOKEN not set, skipping bot polling.");
    return;
  }
  if (!appUrl) {
    console.log("FEETRATE_PUBLIC_URL not set, skipping bot polling (no URL to open).");
    return;
  }

  try {
    await callTelegram(token, "setChatMenuButton", {
      menu_button: { type: "web_app", text: "Feetrate", web_app: { url: appUrl } },
    });
  } catch (err) {
    console.error("Failed to set chat menu button:", err);
  }

  let offset = 0;
  console.log("Telegram bot polling started.");

  while (true) {
    try {
      const res = await fetch(
        `${TELEGRAM_API}/bot${token}/getUpdates?timeout=30&offset=${offset}`
      );
      const data = (await res.json()) as { ok: boolean; result: TelegramUpdate[] };
      if (!data.ok) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      for (const update of data.result) {
        offset = update.update_id + 1;
        await handleUpdate(token, appUrl, update).catch((err) =>
          console.error("Error handling update:", err)
        );
      }
    } catch (err) {
      console.error("Polling error:", err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
