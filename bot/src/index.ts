import { Bot, GrammyError, HttpError, InlineKeyboard } from "grammy";
import { config } from "./config.js";

const bot = new Bot(config.botToken);

const OPEN_APP_TEXT = "Открыть приложение";

/** Кнопка под сообщением, которая открывает Mini App. */
const openAppKeyboard = () => new InlineKeyboard().webApp(OPEN_APP_TEXT, config.webAppUrl);

const GREETING = [
  "Привет! 🐾",
  "Здесь семья заботится о собаке вместе: задачи, напоминания и прогресс.",
  "",
  "Нажмите «Открыть приложение», чтобы посмотреть план на сегодня.",
].join("\n");

const HELP = [
  "Что умеет Syncra PET сейчас:",
  "• /start — приветствие и запуск приложения",
  "• /app — открыть приложение",
  "",
  "Кнопка «Открыть приложение» также всегда есть в меню чата слева от поля ввода.",
].join("\n");

bot.command("start", async (ctx) => {
  // Позже здесь будет код приглашения в семью: /start <код> (ctx.match).
  if (ctx.match) console.log(`/start с параметром: ${ctx.match}`);
  await ctx.reply(GREETING, { reply_markup: openAppKeyboard() });
});

bot.command("app", (ctx) => ctx.reply("План на сегодня — в приложении 👇", { reply_markup: openAppKeyboard() }));

bot.command("help", (ctx) => ctx.reply(HELP, { reply_markup: openAppKeyboard() }));

// На любые другие сообщения пока отвечаем подсказкой. Голосовой ввод — на следующих этапах.
bot.on("message", (ctx) =>
  ctx.reply("Пока я умею открывать приложение. Нажмите кнопку ниже или /help.", {
    reply_markup: openAppKeyboard(),
  }),
);

bot.catch((err) => {
  const e = err.error;
  if (e instanceof GrammyError) console.error("Ошибка Telegram API:", e.description);
  else if (e instanceof HttpError) console.error("Нет связи с Telegram:", e);
  else console.error("Неизвестная ошибка:", e);
});

async function main() {
  // Список команд в меню «/» и постоянная кнопка «Открыть приложение» в чате.
  await bot.api.setMyCommands([
    { command: "start", description: "Приветствие и запуск приложения" },
    { command: "app", description: "Открыть приложение" },
    { command: "help", description: "Помощь" },
  ]);
  await bot.api.setChatMenuButton({
    menu_button: { type: "web_app", text: OPEN_APP_TEXT, web_app: { url: config.webAppUrl } },
  });

  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());

  await bot.start({
    onStart: (me) => {
      console.log(`✅ Бот @${me.username} запущен.`);
      console.log(`   Mini App: ${config.webAppUrl}`);
      console.log("   Остановить: Ctrl+C");
    },
  });
}

main().catch((e) => {
  if (e instanceof GrammyError && e.error_code === 401) {
    console.error("\n❌ Telegram не принял BOT_TOKEN. Скопируйте токен из @BotFather заново.\n");
  } else {
    console.error(e);
  }
  process.exit(1);
});
