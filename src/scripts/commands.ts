import * as browse from "./browse";
import * as speak from "./speak";
import { getMemory } from "./memory"; // todo: how
import * as agents from "./agent-manager";
import { Config } from "./config";
import * as aiFunctions from "./ai-functions";
import { readFile, writeToFile, appendToFile, deleteFile, searchFiles } from "./file-operations";
import { executeJsFile } from "./execute-code";
import { fixAndParseJson } from "./json-parser";
import { generateImage } from "./image-gen";
import type { PromptResponseFormat } from "./prompt-generator";
// import { ddg } from "duckduckgo_search";
// import { google } from "googleapis";

const cfg = new Config();

function isValidInt(value) {
  const num = Number(value);
  return !isNaN(num);
}

type CommandResponse =
  | [string, string]
  | [PromptResponseFormat["command"]["name"], PromptResponseFormat["command"]["args"]];
function getCommand(response: PromptResponseFormat): CommandResponse {
  try {
    if (!response.command) {
      return ["Error", 'Missing "command" object in JSON'];
    }

    const command = response.command;

    if (!command.name) {
      return ["Error", 'Missing "name" field in "command" object'];
    }

    const commandName = command.name;
    const args = command.args || {};

    return [commandName, args];
  } catch (error) {
    if (error instanceof SyntaxError) {
      return ["Error", "Invalid JSON"];
    } else {
      return ["Error", error.message];
    }
  }
}

async function executeCommand(commandName, args) {
  const memory = getMemory(cfg);

  try {
    switch (commandName) {
      case "google":
        if (cfg.googleApiKey && cfg.googleApiKey.trim()) {
          return await googleOfficialSearch(args.input);
        } else {
          return await googleSearch(args.input);
        }
      case "memoryAdd":
        return memory.add(args.string);
      case "startAgent":
        return startAgent(args.name, args.task, args.prompt);
      case "messageAgent":
        return messageAgent(args.key, args.message);
      case "listAgents":
        return listAgents();
      case "deleteAgent":
        return deleteAgent(args.key);
      case "getTextSummary":
        return getTextSummary(args.url, args.question);
      case "getHyperlinks":
        return getHyperlinks(args.url);
      case "readFile":
        return readFile(args.file);
      case "writeToFile":
        return writeToFile(args.file, args.text);
      case "appendToFile":
        return appendToFile(args.file, args.text);
      case "deleteFile":
        return deleteFile(args.file);
      case "searchFiles":
        return searchFiles(args.directory);
      case "browseWebsite":
        return browseWebsite(args.url, args.question);
      case "evaluateCode":
        return aiFunctions.evaluateCode(args.code);
      case "improveCode":
        return aiFunctions.improveCode(args.suggestions, args.code);
      case "writeTests":
        return aiFunctions.writeTests(args.code, args.focus);
      case "executeJavascriptFile":
        return executeJsFile(args.file);
      case "generateImage":
        return generateImage(args.prompt);
      case "doNothing":
        return "No action performed.";
      case "taskComplete":
        process.exit(0);
      default:
        return `Unknown command '${commandName}'. Please refer to the 'COMMANDS' list for available commands and only respond in the specified JSON format.`;
    }
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

function getDatetime() {
  return `Current date and time: ${new Date().toLocaleString()}`;
}

async function googleSearch(query, numResults = 8) {
  // const searchResults = await ddg(query, { maxResults: numResults });
  // return JSON.stringify(searchResults, null, 4);
}

async function googleOfficialSearch(query, numResults = 8) {
  // try {
  //   const apiKey = cfg.googleApiKey;
  //   const customSearchEngineId = cfg.customSearchEngineId;
  //   const customsearch = google.customsearch("v1");
  //   const result = await customsearch.cse.list({
  //     q: query,
  //     cx: customSearchEngineId,
  //     num: numResults,
  //     auth: apiKey,
  //   });
  //   const searchResults = result.data.items || [];
  //   const searchResultsLinks = searchResults.map((item) => item.link);
  //   return searchResultsLinks;
  // } catch (error) {
  //   if (error.code === 403 && error.message.includes("invalid API key")) {
  //     return "Error: The provided Google API key is invalid or missing.";
  //   } else {
  //     return `Error: ${error}`;
  //   }
  // }
}

async function browseWebsite(url, question) {
  const summary = await getTextSummary(url, question);
  const links = await getHyperlinks(url);

  if (links.length > 5) {
    links.splice(5);
  }

  return `Website Content Summary: ${summary}\n\nLinks: ${links}`;
}

async function getTextSummary(url, question) {
  const text = await browse.scrapeText(url);
  const summary = await browse.summarizeText(text, question);
  return ` "Result" : ${summary}`;
}

async function getHyperlinks(url) {
  return await browse.scrapeLinks(url);
}

function commitMemory(string) {
  const text = `Committing memory with string "${string}" `;
  getMemory(cfg).permanentMemory.push(string);
  return text;
}

function deleteMemory(key) {
  let memory = getMemory(cfg).permanentMemory;

  if (key >= 0 && key < memory.length) {
    const text = `Deleting memory with key ${key}`;
    memory = [...memory.slice(0, key), ...memory.slice(key + 1)];
    return text;
  } else {
    return "Invalid key, cannot delete memory.";
  }
}

function overwriteMemory(key, string) {
  const memory = getMemory(cfg).permanentMemory;

  if (isValidInt(key)) {
    const keyInt = parseInt(key, 10);

    if (0 <= keyInt && keyInt < memory.length) {
      const text = `Overwriting memory with key ${key} and string ${string}`;
      memory[keyInt] = string;
      return text;
    } else {
      return `Invalid key '${key}', out of range.`;
    }
  } else if (typeof key === "string") {
    const text = `Overwriting memory with key ${key} and string ${string}`;
    memory[key] = string;
    return text;
  } else {
    return `Invalid key '${key}', must be an integer or a string.`;
  }
}

function shutdown() {
  console.log("Shutting down...");
  process.exit(0);
}

async function startAgent(name, task, prompt, model = cfg.fastLlmModel) {
  // Start an agent with a given name, task, and prompt
  let voiceName = name.replace("_", " ");
  let firstMessage = `You are ${name}. Respond with: "Acknowledged".`;
  let agentIntro = `${voiceName} here, Reporting for duty!`;

  // Create agent
  if (cfg.speakMode) {
    speak.sayText(agentIntro, 1);
  }
  let { key, agentReply } = await agents.createAgent(task, firstMessage, model);

  if (cfg.speakMode) {
    speak.sayText(`Hello ${voiceName}. Your task is as follows. ${task}.`);
  }

  // Assign task (prompt), get response
  let agentResponse = messageAgent(key, prompt);

  return `Agent ${name} created with key ${key}. First response: ${agentResponse}`;
}

function messageAgent(key: number, message: string): string {
  // Message an agent with a given key and message
  let agentResponse;
  if (isValidInt(key) || typeof key === "string") {
    agentResponse = agents.messageAgent(key, message);
  } else {
    return "Invalid key, must be an integer or a string.";
  }

  // Speak response
  if (cfg.speakMode) {
    speak.sayText(agentResponse, 1);
  }
  return agentResponse;
}

function listAgents() {
  // List all agents
  return agents.listAgents();
}

function deleteAgent(key) {
  // Delete an agent with a given key
  let result = agents.deleteAgent(key);
  if (!result) {
    return `Agent ${key} does not exist.`;
  }
  return `Agent ${key} deleted.`;
}

export {
  getCommand,
  executeCommand,
  getDatetime,
  googleSearch,
  googleOfficialSearch,
  browseWebsite,
  commitMemory,
  deleteMemory,
  overwriteMemory,
  shutdown,
  startAgent,
  messageAgent,
  listAgents,
  deleteAgent,
};
