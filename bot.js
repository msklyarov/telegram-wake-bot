const TelegramBot = require("node-telegram-bot-api");
const request = require("request");
const token = process.env.TELEGRAM_TOKEN;
const fs = require("fs");
const fetch = require("node-fetch");
const sharp = require("sharp");
const Tesseract = require("tesseract.js");
const puppeteer = require("puppeteer");

const bot = new TelegramBot(token, { polling: true });
const currentWeatherUrl = "http://80.68.8.91/weather/Graph/weather.png";
const windArchiveUrl = "http://80.68.8.91/weather/Graph/wind.png";
const cam1BaseUrl = "http://46.101.98.149:8080/webcams/cam1/";
const cam2BaseUrl = "http://46.101.98.149:8080/webcams/cam2/";
const scaleFactor = 5;

const getFilename1 = () => {
  const list = fs.readdirSync("../cams/cam1");
  return list[list.length - 1];
};

const getFilename2 = () => {
  const list = fs.readdirSync("../cams/cam2");
  return list[list.length - 1];
};

const getDateFromFile = (filename) => {
  const dateTime = filename.substring(4, filename.length - 4).split("_");
  return `Date: ${dateTime[0].replace(/-/g, ".")} ${dateTime[1].replace(
    "-",
    ":"
  )}`;
};

const getTextWeather = () =>
  new Promise((resolve) =>
    fetch(currentWeatherUrl)
      .then((res) => res.buffer())
      .then((buffer) => {
        sharp(buffer)
          .metadata()
          .then((info) => {
            const width = info.width * scaleFactor;
            const height = info.height * scaleFactor;

            return sharp(buffer)
              .resize(width, height)
              .linear(0.5, 0) // experimental filter & factor
              .toBuffer();
          })
          .then((output) => {
            Tesseract.recognize(output, {
              lang: "rus",
            }).then((result) => resolve(result.text));
          });
      })
  );

const getBriefWGuru = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 660, height: 235 });
  await page.goto(
    "http://www.windguru.cz/int/distr_iframe.php?u=378913&s=241369&c=f8a31e2556&lng=en"
  );

  const screenshot = await page.screenshot({
    encoding: "binary",
  });

  await browser.close();

  return screenshot;
};

bot.onText(/\/cam1/, (msg, match) => {
  const chatId = msg.chat.id;
  const filename = getFilename1();
  bot.sendMessage(chatId, getDateFromFile(filename));
  const stream = request.get(`${cam1BaseUrl}${filename}`);
  bot.sendPhoto(chatId, stream);
});

bot.onText(/\/cam2/, (msg, match) => {
  const chatId = msg.chat.id;
  const filename = getFilename2();
  bot.sendMessage(chatId, getDateFromFile(filename));
  const stream = request.get(`${cam2BaseUrl}${filename}`);
  bot.sendPhoto(chatId, stream);
});

bot.onText(/\/curr-img/, (msg, match) => {
  const chatId = msg.chat.id;
  const stream = request.get(currentWeatherUrl);
  bot.sendPhoto(chatId, stream);
});

bot.onText(/\/current/, (msg, match) => {
  const chatId = msg.chat.id;
  getTextWeather().then((result) => bot.sendMessage(chatId, result));
});

bot.onText(/\/wguru/, (msg, match) => {
  const chatId = msg.chat.id;
  getBriefWGuru().then((stream) => bot.sendPhoto(chatId, stream));
});

bot.onText(/\/archive/, (msg, match) => {
  const chatId = msg.chat.id;
  const stream = request.get(windArchiveUrl);
  bot.sendPhoto(chatId, stream);
});

bot.onText(/\/all/, (msg, match) => {
  const chatId = msg.chat.id;
  const filename1 = getFilename1();
  bot.sendMessage(chatId, getDateFromFile(filename1));
  const stream1 = request.get(`${cam1BaseUrl}${filename1}`);
  bot.sendPhoto(chatId, stream1);
  const filename2 = getFilename2();
  bot.sendMessage(chatId, getDateFromFile(filename2));
  const stream2 = request.get(`${cam2BaseUrl}${filename2}`);
  bot.sendPhoto(chatId, stream2);
  getTextWeather().then((result) => bot.sendMessage(chatId, result));
  const stream3 = request.get(windArchiveUrl);
  bot.sendPhoto(chatId, stream3);
  getBriefWGuru().then((stream) => bot.sendPhoto(chatId, stream));
});

bot.onText(/\/map/, (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendLocation(chatId, 47.204642388766935, 38.94378662109375);
});

bot.onText(/\/help|\/start/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = `
<b>/cam1</b> - get latest picture from DOSAAF\n\r
<b>/cam2</b> - get latest picture from surfclub\n\r
<b>/curr-img</b> - get current weather as image\n\r
<b>/current</b> - get current weather as text\n\r
<b>/wguru</b> - get brief Wind Guru forecast\n\r
<b>/archive</b> - archive per day\n\r
<b>/all</b> - get all data\n\r
<b>/map</b> - view location\n\r
<b>/help</b> - view help commands\n\r

<i>Resource of weather value</i> <a href="http://taganrog.azovseaports.ru">taganrog.azovseaports.ru</a>
<i>Author</i> <a href="https://t.me/sklyarov_ivan">Sklyarov Ivan</a>

  `;
  bot.sendMessage(chatId, resp, { parse_mode: "HTML" });
});
