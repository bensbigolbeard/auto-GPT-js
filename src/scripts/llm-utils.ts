import { Configuration, OpenAIApi } from "openai";
import type { CreateChatCompletionRequest } from "openai";
import { Config } from "./config";
import * as logger from "./logger";

const config = new Config();
type ChatCompletionOptions = Pick<CreateChatCompletionRequest, "messages" | "model" | "temperature" | "max_tokens">;
type ChatCompletionInputs = {
  messages?: ChatCompletionOptions["messages"];
  model?: ChatCompletionOptions["model"];
  temperature?: ChatCompletionOptions["temperature"];
  maxTokens?: ChatCompletionOptions["max_tokens"];
};
let calls = 0;
async function createChatCompletion({
  messages = [],
  model = "",
  temperature = 0,
  maxTokens = 300,
}: ChatCompletionInputs) {
  const options: ChatCompletionOptions = {
    model: model,
    messages: messages,
    temperature: temperature,
    max_tokens: maxTokens,
  };

  if (config.useAzure) {
    logger.log({ title: "NOTE: We dont use Azure for chat completions yet. Not including deployment_id." });
    // options.deployment_id = config.azureChatDeploymentId;
  }
  const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
  console.log("OpenAI calls", ++calls);
  const response = await openai.createChatCompletion(options);

  return response.data.choices[0].message?.content || "";
}

export { createChatCompletion };
export type { ChatCompletionInputs };
