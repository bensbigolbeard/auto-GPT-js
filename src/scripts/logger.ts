import winston from "winston";
import chalk from "chalk";
import fs from "node:fs";
import path from "path";
import * as speak from "./speak";

const logDir = path.join("..", "logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
  colors: {
    error: "red",
    warn: "yellow",
    info: "green",
    debug: "blue",
  },
};

let logger: winston.Logger;

const logFile = "activity.log";
const errorFile = "error.log";

const consoleFormatter = winston.format.printf(({ level, message }) => {
  return `${message}`;
});

const fileFormatter = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} ${level} ${message}`;
});

const getColorFormatter = (color) => (color && (chalk[color] || chalk.hex(color))) || ((text) => text);
const colorFormatter = (color, text) => getColorFormatter(color)(text);

const createLogger = (level = "debug") =>
  winston.createLogger({
    level,
    levels: customLevels.levels,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.metadata({
        fillExcept: ["message", "level", "timestamp", "label"],
      })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), consoleFormatter),
      }),
      new winston.transports.File({
        filename: path.join(logDir, logFile),
        format: fileFormatter,
      }),
      new winston.transports.File({
        filename: path.join(logDir, errorFile),
        level: "error",
        format: fileFormatter,
      }),
    ],
  });

logger = createLogger();

function setLevel(level = "info") {
  logger = createLogger(level);
}

function log({ title = "", titleColor = "", message = "", level = "debug" }) {
  const fullMessage = `${colorFormatter(titleColor, title)} ${message}`;
  logger.log({ level, message: fullMessage });
}

function typewriterLog({ title = "", titleColor = "", content = "", level = "debug", speakText = false }) {
  const fullMessage = `${colorFormatter(titleColor, title)} ${content}`;
  if (speakText) {
    speak.sayText(`${title}. ${content}`);
  }

  logger.log({ level, message: fullMessage });
  return typeMessage(fullMessage);
}

const typeMessage = async (message, minSpeed = 20, maxSpeed = 50) => {
  const words = message.split(" ");

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    process.stdout.write(word);

    if (i < words.length - 1) {
      process.stdout.write(" ");
    }

    const typingSpeed = Math.floor(Math.random() * (maxSpeed - minSpeed + 1)) + minSpeed;
    await new Promise((resolve) => setTimeout(resolve, typingSpeed));
  }

  process.stdout.write("\n");
};

export { log, typewriterLog, colorFormatter, getColorFormatter, setLevel };
