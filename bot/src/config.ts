import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Читаем общий файл .env из корня проекта (syncra-pet/.env).
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

function fail(message: string): never {
  console.error(`\n❌ ${message}\n   Проверьте файл .env в корне проекта (образец — .env.example).\n`);
  process.exit(1);
}

const botToken = process.env.BOT_TOKEN?.trim();
const webAppUrl = process.env.WEBAPP_URL?.trim();

if (!botToken) fail("Не задан BOT_TOKEN — токен бота от @BotFather.");
if (!webAppUrl) fail("Не задан WEBAPP_URL — HTTPS-адрес Mini App.");
if (!webAppUrl.startsWith("https://")) {
  fail(`WEBAPP_URL должен начинаться с https:// — Telegram не откроет другой адрес. Сейчас: ${webAppUrl}`);
}

export const config = { botToken, webAppUrl } as const;
