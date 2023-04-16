import fs from "node:fs";
import * as commands from "./commands";
import * as utils from "./utils";
import * as logger from "./logger";
import * as speak from "./speak";
import { getMemory, getSupportedMemoryBackends } from "./memory/index";
import { Config } from "./config";
import { Spinner } from "./spinner";
import { getPrompt } from "./prompt";
import { chatWithAi, createChatMessage } from "./chat";
import { fixAndParseJson } from "./json-parser";
import { AIConfig } from "./ai-config";
import yaml from "js-yaml";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { attemptToFixJsonByFindingOutermostBrackets } from "./json-utils";
import { PromptResponseFormat } from "./prompt-generator";

const cfg = new Config();

// Get rid of this global:
let aiName;

function checkOpenaiApiKey() {
  if (!cfg.openaiApiKey) {
    console.log(
      logger.colorFormatter("red", "Please set your OpenAI API key in config.js or as an environment variable.")
    );
    console.log("You can get your key from https://beta.openai.com/account/api-keys");
    process.exit(1);
  }
}

async function attemptToFixJson(string): Promise<string> {
  if (cfg.speakMode && cfg.debugMode) {
    speak.sayText("I have received an invalid JSON response from the OpenAI API. Trying to fix it now.");
  }
  await logger.typewriterLog({ content: "Attempting to fix JSON by finding outermost brackets\n" });

  const { isValid, jsonString } = await attemptToFixJsonByFindingOutermostBrackets(string);

  if (isValid) {
    await logger.typewriterLog({ content: "Apparently json was fixed.", titleColor: "green" });
    if (cfg.speakMode && cfg.debugMode) {
      speak.sayText("Apparently json was fixed.");
    }
  } else {
    await logger.typewriterLog({
      content: "Didn't work. I will have to ignore this response then.",
      titleColor: "yellow",
    });
    if (cfg.speakMode) {
      speak.sayText("Didn't work. I will have to ignore this response then.");
    }
    // throw new Error("No valid JSON object found");
  }
  return jsonString;
}

async function printAssistantThoughts(assistantReply: PromptResponseFormat) {
  try {
    const { text, reasoning, plan, criticism, speak: speakText } = assistantReply.thoughts;

    await logger.typewriterLog({
      title: `${aiName.toUpperCase()} THOUGHTS:`,
      titleColor: "yellow",
      content: text,
    });
    await logger.typewriterLog({ title: "REASONING:", titleColor: "yellow", content: reasoning });

    if (plan) {
      await logger.typewriterLog({ title: "PLAN:", titleColor: "yellow" });
      let lines = plan.split("\n");
      for (const line of lines) {
        let strippedLine = line.trim();
        await logger.typewriterLog({ title: "- ", titleColor: "green", content: strippedLine });
      }
    }

    await logger.typewriterLog({ title: "CRITICISM:", titleColor: "yellow", content: criticism });

    if (cfg.speakMode && speakText) {
      speak.sayText(speakText);
    }

    return assistantReply;
  } catch (e) {
    console.error("Error: printAssistantThoughts failed \n", e.stack);
  }
}

async function constructPrompt() {
  let config = AIConfig.load();

  if (config.aiName) {
    await logger.typewriterLog({
      title: "Welcome back! ",
      titleColor: "green",
      content: `Would you like me to return to being ${config.aiName}?`,
      // speakText: true,
    });
    let shouldContinue = await utils.cleanInput(`Continue with the last settings?
  Name:  ${config.aiName}
  Role:  ${config.aiRole}
  Goals: ${config.aiGoals}
  Continue (y/n): `);

    if (shouldContinue.toLowerCase() === "n") {
      config = new AIConfig();
    }
  }

  if (!config.aiName) {
    config = await promptUser();
    config.save();
  }

  // Get rid of this global:
  aiName = config.aiName;

  let fullPrompt = config.constructFullPrompt(); // TODO: Implement config.constructFullPrompt() function in JavaScript
  return fullPrompt;
}

async function promptUser() {
  let aiName = "";

  await logger.typewriterLog({
    title: "Welcome to Auto-GPT!",
    titleColor: "green",
    content: "Enter the name of your AI and its role below. Entering nothing will load defaults.",
  });

  await logger.typewriterLog({
    title: "Name your AI: ",
    titleColor: "green",
    content: "For example, 'Entrepreneur-GPT'",
  });

  aiName = await utils.cleanInput("AI Name: ");
  if (aiName === "") {
    aiName = "Entrepreneur-GPT";
  }

  await logger.typewriterLog({ title: `${aiName} here!`, titleColor: "lightblue", content: "I am at your service." });

  await logger.typewriterLog({
    title: "Describe your AI's role: ",
    titleColor: "green",
    content:
      "For example, 'an AI designed to autonomously develop and run businesses with the sole goal of increasing your net worth.'",
  });
  let aiRole = await utils.cleanInput(`${aiName} is: `);
  if (aiRole === "") {
    aiRole =
      "an AI designed to autonomously develop and run businesses with the sole goal of increasing your net worth.";
  }

  await logger.typewriterLog({
    title: "Enter up to 5 goals for your AI: ",
    titleColor: "green",
    content:
      "For example: \nIncrease net worth, Grow Twitter Account, Develop and manage multiple businesses autonomously'",
  });
  console.log("Enter nothing to load defaults, enter nothing when finished.");
  let aiGoals: string[] = [];
  for (let i = 0; i < 5; i++) {
    let aiGoal = await utils.cleanInput(`Goal ${i + 1}: `);
    if (aiGoal === "") {
      break;
    }
    aiGoals.push(aiGoal);
  }
  if (aiGoals.length === 0) {
    aiGoals = ["Increase net worth", "Grow Twitter Account", "Develop and manage multiple businesses autonomously"];
  }

  let config = new AIConfig({ aiName, aiRole, aiGoals });
  return config;
}

async function parseArguments() {
  const argv = yargs(hideBin(process.argv))
    .option("continuous", {
      type: "boolean",
      description: "Enable Continuous Mode",
    })
    .option("continuous-limit", {
      alias: "l",
      type: "number",
      description: "Defines the number of times to run in continuous mode",
    })
    .option("speak", {
      type: "boolean",
      description: "Enable Speak Mode",
    })
    .option("debug", {
      type: "boolean",
      description: "Enable Debug Mode",
    })
    .option("gpt3only", {
      type: "boolean",
      description: "Enable GPT3.5 Only Mode",
    })
    .option("gpt4only", {
      type: "boolean",
      description: "Enable GPT4 Only Mode",
    })
    .option("memoryType", {
      alias: "m",
      type: "string",
      description: "Defines which Memory backend to use",
    })
    .check((argv) => {
      if (argv.continuousLimit && !argv.continuous) {
        throw new Error("--continuous-limit can only be used with --continuous");
      }
      return true;
    }).argv;

  cfg.setDebugMode(argv.debug);
  cfg.setContinuousMode(argv.continuous);
  cfg.setSpeakMode(argv.speak);

  if (argv.continuousLimit) {
    cfg.setContinuousLimit(argv.continuousLimit);
  }

  if (argv.gpt3only) {
    cfg.setSmartLlmModel(cfg.fastLlmModel);
  }

  if (argv.gpt4only) {
    cfg.setFastLlmModel(cfg.smartLlmModel);
  }

  if (argv.useMemory) {
    const supportedMemory = getSupportedMemoryBackends();
    const chosen = argv.useMemory;

    if (!supportedMemory.includes(chosen)) {
      await logger.typewriterLog({
        title: "ONLY THE FOLLOWING MEMORY BACKENDS ARE SUPPORTED: ",
        titleColor: "red",
        content: supportedMemory.join(", "),
      });
      await logger.typewriterLog({ title: "Defaulting to: ", titleColor: "yellow", content: cfg.memoryBackend });
    } else {
      cfg.memoryBackend = chosen;
    }
  }
}

(async () => {
  checkOpenaiApiKey();
  await parseArguments();
  logger.setLevel(cfg.debugMode ? "debug" : "info");
  const aiName = "";
  const prompt = await constructPrompt();
  let fullMessageHistory: ReturnType<typeof createChatMessage>[] = [];
  let result: string | null = null;
  let nextActionCount = 0;
  let userInput = "Determine which next command to use, and respond using the format specified above:";

  let memorySet = getMemory(cfg, true);
  console.log("Using memory of type: " + memorySet.constructor.name);

  const spinner = new Spinner("Thinking... ");
  let loopCount = 0;

  // Interaction Loop
  // setInterval(async () => {
  if (cfg.continuousMode && cfg.continuousLimit && loopCount >= cfg.continuousLimit) {
    await logger.typewriterLog({
      title: "Continuous Limit Reached:",
      titleColor: "yellow",
      content: `${cfg.continuousLimit}`,
    });
    throw "Continuous Limit Reached";
  }

  // Send message to AI, get response
  const assistantReply = await spinner.awaitWithSpinner(
    chatWithAi({
      prompt,
      userInput,
      fullMessageHistory,
      permanentMemory: memorySet,
      tokenLimit: cfg.fastTokenLimit, // TODO: This hardcodes the model to use GPT3.5. Make this an argument
    })
  );

  let cmndArgs;
  let cmndName;
  let jsonReply: PromptResponseFormat;

  try {
    jsonReply = JSON.parse(assistantReply);
  } catch (e) {
    console.log("Error parsing JSON, attempting to fix by finding outermost brackets", e);
    try {
      jsonReply = JSON.parse(await attemptToFixJson(assistantReply));
    } catch (err) {
      console.log("Error parsing JSON, even after attempts to fix", err);
      throw err;
    }
  }

  // Print Assistant thoughts
  await printAssistantThoughts(jsonReply);

  // Get command name and arguments
  try {
    let [commandName, args] = commands.getCommand(jsonReply);
    cmndArgs = args;
    cmndName = commandName;
    if (cfg.speakMode) {
      speak.sayText(`I want to execute ${commandName}`);
    }
  } catch (e) {
    logger.log({ title: `Error: \n${e.toString()}` });
  }

  const cyanLog = logger.getColorFormatter("cyan");
  if (!cfg.continuousMode && nextActionCount === 0) {
    // Get user authorization to execute command
    userInput = "";
    await logger.typewriterLog({
      title: "NEXT ACTION: ",
      titleColor: "cyan",
      content: `COMMAND = ${cyanLog(cmndName)}  ARGUMENTS = ${cyanLog(JSON.stringify(cmndArgs))}`,
    });
    console.log(
      `Enter 'y' to authorise command, 'y -N' to run N continuous commands, 'n' to exit program, or enter feedback for ${aiName}...`
    );

    let consoleInput = await utils.cleanInput("Input:");
    if (consoleInput.toLowerCase().trim() === "y") {
      userInput = "GENERATE NEXT COMMAND JSON";
    } else if (consoleInput.toLowerCase().startsWith("y -")) {
      try {
        nextActionCount = Math.abs(parseInt(consoleInput.split(" ")[1]));
        userInput = "GENERATE NEXT COMMAND JSON";
      } catch (error) {
        console.log("Invalid input format. Please enter 'y -n' where n is the number of continuous tasks.");
      }
    } else if (consoleInput.toLowerCase() === "n") {
      userInput = "EXIT";
      process.exit(0);
    } else {
      userInput = consoleInput;
      cmndName = "humanFeedback";
    }

    if (userInput === "GENERATE NEXT COMMAND JSON") {
      await logger.typewriterLog({
        title: "-=-=-=-=-=-=-= COMMAND AUTHORISED BY USER -=-=-=-=-=-=-=",
        titleColor: "magenta",
      });
    } else if (userInput === "EXIT") {
      console.log("Exiting...");
      process.exit(0);
    }
  } else {
    // Print command
    await logger.typewriterLog({
      title: "NEXT ACTION: ",
      titleColor: "cyan",
      content: `COMMAND = ${cyanLog(cmndName)}  ARGUMENTS = ${cyanLog(cmndArgs)}`,
    });
  }

  // Execute command
  if (cmndName && cmndArgs.toLowerCase().startsWith("error")) {
    result = `Command ${cmndName} threw the following error: ${cmndArgs}`;
  } else if (cmndName === "humanFeedback") {
    result = `Human feedback: ${userInput}`;
  } else {
    result = `Command ${cmndName} returned: ${await commands.executeCommand(cmndName, cmndArgs)}`;
    if (nextActionCount > 0) {
      nextActionCount -= 1;
    }
  }

  let memoryToAdd = `Assistant Reply: ${assistantReply} ` + `\nResult: ${result} ` + `\nHuman Feedback: ${userInput} `;

  await memorySet.add(memoryToAdd);

  if (result) {
    fullMessageHistory.push(createChatMessage("system", result));
    await logger.typewriterLog({ title: "SYSTEM: ", titleColor: "yellow", content: result });
  } else {
    fullMessageHistory.push(createChatMessage("system", "Unable to execute command"));
    await logger.typewriterLog({ title: "SYSTEM: ", titleColor: "yellow", content: "Unable to execute command" });
  }
})();
