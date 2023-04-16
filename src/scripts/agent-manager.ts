import { createChatCompletion } from "./llm-utils";
import type { ChatCompletionInputs } from "./llm-utils";

let nextKey = 0;
const agents: Record<string, { task; messages; model }> = {};

function createAgent(task, prompt, model) {
  const messages: ChatCompletionInputs["messages"] = [{ role: "user", content: prompt }];

  return createChatCompletion({ messages, model }).then((agentReply) => {
    messages.push({ role: "assistant", content: agentReply });

    const key = nextKey;
    nextKey += 1;

    agents[key] = { task, messages, model };

    return { key, agentReply };
  });
}

function messageAgent(key: number | string, message: string) {
  const agent = agents[key];

  if (!agent) {
    throw new Error("Agent not found");
  }

  const { task, messages: fullMessageHistory, model } = agent;

  fullMessageHistory.push({ role: "user", content: message });

  return createChatCompletion({ messages: fullMessageHistory, model }).then((agentReply) => {
    fullMessageHistory.push({ role: "assistant", content: agentReply });
    return agentReply;
  });
}

function listAgents() {
  return Object.entries(agents).map(([key, { task }]) => ({ key, task }));
}

function deleteAgent(key) {
  if (agents.hasOwnProperty(key)) {
    delete agents[key];
    return true;
  }
  return false;
}

export { createAgent, messageAgent, listAgents, deleteAgent };
