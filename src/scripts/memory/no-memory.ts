import { Config } from "../config";
import { MemoryProviderSingleton } from "./memory-base";

class NoMemory extends MemoryProviderSingleton {
  constructor(cfg: Config) {
    super();
    // Initializes the NoMemory provider.
  }

  add(data) {
    // Adds a data point to the memory. No action is taken in NoMemory.
    return "";
  }

  get(data) {
    // Gets the data from the memory that is most relevant to the given data.
    // NoMemory always returns null.
    return null;
  }

  clear() {
    // Clears the memory. No action is taken in NoMemory.
    return "";
  }

  getRelevant(data, numRelevant = 5) {
    // Returns all the data in the memory that is relevant to the given data.
    // NoMemory always returns null.
    return null;
  }

  getStats() {
    // Returns an empty object as there are no stats in NoMemory.
    return {};
  }
}

export { NoMemory };
