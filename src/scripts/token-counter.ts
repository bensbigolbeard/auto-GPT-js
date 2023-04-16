import tiktoken from "@dqbd/tiktoken";
import type { TiktokenModel } from "@dqbd/tiktoken";
const { get_encoding, encoding_for_model } = tiktoken;

function countMessageTokens(messages, model = "gpt-3.5-turbo-0301") {
  let encoding;
  try {
    encoding = encoding_for_model(model as TiktokenModel);
  } catch (error) {
    console.warn("Warning: model not found. Using cl100k_base encoding.");
    encoding = get_encoding("cl100k_base");
  }

  if (model === "gpt-3.5-turbo") {
    return countMessageTokens(messages, "gpt-3.5-turbo-0301");
  } else if (model === "gpt-4") {
    return countMessageTokens(messages, "gpt-4-0314");
  }

  const tokensPerMessage = model === "gpt-3.5-turbo-0301" ? 4 : 3;
  const tokensPerName = model === "gpt-3.5-turbo-0301" ? -1 : 1;

  let numTokens = 0;
  for (const message of messages) {
    numTokens += tokensPerMessage;
    for (const [key, value] of Object.entries(message)) {
      numTokens += encoding.encode(value).length;
      if (key === "name") {
        numTokens += tokensPerName;
      }
    }
  }
  numTokens += 3; // every reply is primed with assistant
  return numTokens;
}

function countStringTokens(string, model_name) {
  const encoding = encoding_for_model(model_name);
  const numTokens = encoding.encode(string).length;
  return numTokens;
}

export { countMessageTokens, countStringTokens };
