import { Config } from "../config";
import { LocalCache } from "./local";
import { NoMemory } from "./no-memory";
import { PineconeMemory } from "./pinecone";
import { RedisMemory } from "./redis";

const cfg = new Config();

// List of supported memory backends
// Add a backend to this list if the import attempt is successful
const supportedMemory = ["local"];

try {
  if (!cfg.redisPassword) {
    throw new Error("Redis URL not set.");
  }
  new RedisMemory(cfg);
  supportedMemory.push("redis");
} catch (err) {
  console.log("Redis not installed.");
}

try {
  if (!cfg.pineconeApiKey) {
    throw new Error("Pinecone key not set.");
  }
  new PineconeMemory(cfg);
  supportedMemory.push("pinecone");
} catch (err) {
  console.log("Pinecone not installed.");
}

function getMemory(cfg, init = false) {
  let memory;

  if (cfg.memoryBackend === "pinecone") {
    if (!supportedMemory.includes("pinecone")) {
      console.log("Error: Pinecone is not installed. Please install pinecone to use Pinecone as a memory backend.");
    } else {
      memory = new PineconeMemory(cfg);
      if (init) {
        memory.clear();
      }
    }
  } else if (cfg.memoryBackend === "redis") {
    if (!supportedMemory.includes("redis")) {
      console.log("Error: Redis is not installed. Please install redis to use Redis as a memory backend.");
    } else {
      memory = new RedisMemory(cfg);
    }
  } else if (cfg.memoryBackend === "no_memory") {
    memory = new NoMemory(cfg);
  }

  if (!memory) {
    memory = new LocalCache(cfg);
    if (init) {
      memory.clear();
    }
  }

  return memory;
}

function getSupportedMemoryBackends() {
  return supportedMemory;
}

export { getMemory, getSupportedMemoryBackends };
