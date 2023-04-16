import { Config } from "./config";
import { createChatCompletion } from "./llm-utils";
import { JSDOM } from "jsdom";
import { URL } from "url";
import * as logger from "./logger";
import type { ChatCompletionRequestMessage } from "openai";

const cfg = new Config();

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

function sanitizeUrl(url) {
  const parsedUrl = new URL(url);
  return parsedUrl.protocol + "//" + parsedUrl.hostname + parsedUrl.pathname;
}

function checkLocalFileAccess(url) {
  const localPrefixes = ["file:///", "file://localhost", "http://localhost", "https://localhost"];
  return localPrefixes.some((prefix) => url.startsWith(prefix));
}

async function scrapeText(url) {
  if (checkLocalFileAccess(url)) {
    return "Error: Access to local files is restricted";
  }

  if (!url.startsWith("https://")) {
    return "Error: Invalid URL";
  }

  if (!isValidUrl(url)) {
    url = sanitizeUrl(url);
  }

  const res = await fetch(url, { headers: cfg.userAgentHeader });
  const response = await res.json();
  const dom = new JSDOM(response.data);

  const { document } = dom.window;

  const scripts = document.querySelectorAll("script, style");

  for (const script of scripts) {
    script.remove();
  }

  const text = document.body.textContent
    ?.split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text;
}

async function scrapeLinks(url) {
  const res = await fetch(url, { headers: cfg.userAgentHeader });
  const response = await res.json();
  const dom = new JSDOM(response.data);

  const { document } = dom.window;

  const anchorTags: NodeListOf<HTMLAnchorElement> = document.querySelectorAll("a[href]");

  const links: string[] = [];

  for (const anchor of anchorTags) {
    links.push(`${anchor.textContent?.trim()} (${anchor.href})`);
  }

  return links;
}
function splitText(text, maxLength = 8192) {
  // Split text into chunks of a maximum length
  const paragraphs: string[] = text.split("\n");
  let currentLength = 0;
  let currentChunk: string[] = [];

  const result: string[] = [];

  for (const paragraph of paragraphs) {
    if (currentLength + paragraph.length + 1 <= maxLength) {
      currentChunk.push(paragraph);
      currentLength += paragraph.length + 1;
    } else {
      result.push(currentChunk.join("\n"));
      currentChunk = [paragraph];
      currentLength = paragraph.length + 1;
    }
  }

  if (currentChunk.length > 0) {
    result.push(currentChunk.join("\n"));
  }

  return result;
}
const createMessage = (chunk: string, question: string): ChatCompletionRequestMessage => ({
  role: "user",
  content: `"${chunk}" Using the above text, please answer the following question: "${question}" -- if the question cannot be answered using the text, please summarize the text.`,
});

async function summarizeText(text, question) {
  if (!text) {
    return "Error: No text to summarize";
  }

  logger.log({ title: `Text length: ${text.length}` });

  const summaries: string[] = [];
  const chunks = splitText(text);

  const summaryPromises = chunks.map((chunk) => {
    const messages = [createMessage(chunk, question)];

    return createChatCompletion({ model: cfg.fastLlmModel, messages, maxTokens: 300 });
  });
  summaries.push(...(await Promise.all(summaryPromises)));

  const combinedSummaries = summaries.join("\n");
  const messages = [createMessage(combinedSummaries, question)];

  const finalSummary = createChatCompletion({
    model: cfg.fastLlmModel,
    messages: messages,
    maxTokens: 300,
  });
  return finalSummary;
}

export { scrapeText, scrapeLinks, summarizeText };
