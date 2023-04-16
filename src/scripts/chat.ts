import { countMessageTokens } from "./token-counter";
import * as logger from "./logger";
import { Config } from "./config";
import { createChatCompletion } from "./llm-utils";

const cfg = new Config();

function createChatMessage(role: string, content: string) {
  return { role, content };
}

function generateContext(prompt, relevantMemory, fullMessageHistory, model) {
  const currentContext = [
    createChatMessage("system", prompt),
    createChatMessage("system", `The current time and date is ${new Date().toLocaleString()}`),
    createChatMessage("system", "This reminds you of these events from your past:\n{relevant_memory}\n\n"),
  ];
  const nextMessageToAddIndex = fullMessageHistory.length - 1;
  const insertionIndex = currentContext.length;
  const currentTokensUsed = countMessageTokens(currentContext, model);
  return [nextMessageToAddIndex, currentTokensUsed, insertionIndex, currentContext];
}

async function chatWithAi({ prompt, userInput, fullMessageHistory, permanentMemory, tokenLimit }) {
  try {
    const model = cfg.fastLlmModel;
    const sendTokenLimit = tokenLimit - 1000;

    logger.log({ title: `Token limit: ${tokenLimit}`, level: "debug" });

    let relevantMemory = await permanentMemory.getRelevant(JSON.stringify(fullMessageHistory.slice(-9)), 10);

    logger.log({ title: `Memory Stats: ${permanentMemory.getStats()}`, level: "debug" });

    let nextMessageToAddIndex;
    let currentTokensUsed;
    let insertionIndex;
    let currentContext;

    [nextMessageToAddIndex, currentTokensUsed, insertionIndex, currentContext] = generateContext(
      prompt,
      relevantMemory,
      fullMessageHistory,
      model
    );

    while (currentTokensUsed > 2500) {
      relevantMemory = relevantMemory.slice(1);

      [nextMessageToAddIndex, currentTokensUsed, insertionIndex, currentContext] = generateContext(
        prompt,
        relevantMemory,
        fullMessageHistory,
        model
      );
    }

    currentTokensUsed += countMessageTokens([createChatMessage("user", userInput)], model);

    while (nextMessageToAddIndex >= 0) {
      const messageToAdd = fullMessageHistory[nextMessageToAddIndex];
      const tokensToAdd = countMessageTokens([messageToAdd], model);

      if (currentTokensUsed + tokensToAdd > sendTokenLimit) {
        break;
      }

      currentContext = [
        ...currentContext.slice(0, insertionIndex),
        messageToAdd,
        ...currentContext.slice(insertionIndex),
      ];

      currentTokensUsed += tokensToAdd;

      nextMessageToAddIndex -= 1;
    }

    currentContext.push(createChatMessage("user", userInput));

    const tokensRemaining = tokenLimit - currentTokensUsed;

    const assistantReply = await createChatCompletion({
      model,
      messages: currentContext,
      maxTokens: tokensRemaining,
    });

    fullMessageHistory.push(createChatMessage("user", userInput));
    fullMessageHistory.push(createChatMessage("assistant", assistantReply));

    return assistantReply;
  } catch (err) {
    if (err.message.includes("API Rate Limit Reached")) {
      console.error("API Rate Limit Reached. Waiting 10 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } else {
      throw err;
    }
  }
}

export { chatWithAi, createChatMessage };
