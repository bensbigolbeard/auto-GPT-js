import { Configuration, OpenAIApi } from "openai";
import { Config } from "../config";

const config = new Config();

const openaiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openaiConfig);

function getAdaEmbedding(text: string) {
  text = text.replace("\n", " ");
  if (config.useAzure) {
    console.log("Azure embeddings not yet implemented. Using OpenAI instead.");
    // return openai.Embedding.create({
    //   input: [text],
    //   engine: config.azureEmbeddingsDeploymentId,
    //   model: "text-embedding-ada-002",
    // }).then((response) => response.data[0].embedding);
  }
  return openai
    .createEmbedding({
      input: [text],
      model: "text-embedding-ada-002",
    })
    .then((response): number[] => response.data.data[0].embedding);
}

class MemoryProviderSingleton {
  private static instance: MemoryProviderSingleton;
  constructor() {
    if (!MemoryProviderSingleton.instance) {
      MemoryProviderSingleton.instance = this;
    }

    return MemoryProviderSingleton.instance;
  }

  // Abstract methods
  add(data) {
    throw new Error("add method must be implemented in a derived class.");
  }

  get(data) {
    throw new Error("get method must be implemented in a derived class.");
  }

  clear() {
    throw new Error("clear method must be implemented in a derived class.");
  }

  getRelevant(data, numRelevant = 5) {
    throw new Error("getRelevant method must be implemented in a derived class.");
  }

  getStats() {
    throw new Error("getStats method must be implemented in a derived class.");
  }
}

export { getAdaEmbedding, MemoryProviderSingleton };
