import fs from "node:fs";
import jsonBigint from "json-bigint";
import np from "bensbigolbeard-numjs";
import { MemoryProviderSingleton, getAdaEmbedding } from "./memory-base";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const orjson = jsonBigint({ storeAsString: true });
const EMBED_DIM = 1536;

class CacheContent {
  texts: string[];
  embeddings: np.ndarray;

  constructor() {
    this.texts = [];
    this.embeddings = np.zeros([1, EMBED_DIM], "float32").tolist();
  }
}

class LocalCache extends MemoryProviderSingleton {
  filename: string;
  data: CacheContent;
  constructor(cfg) {
    super();

    this.filename = path.join(__dirname, "..", `${cfg.memoryIndex}.json`);

    if (fs.existsSync(this.filename)) {
      try {
        const fileContent = fs.readFileSync(this.filename, "utf-8");
        const loaded = orjson.parse(fileContent);
        this.data = Object.assign(new CacheContent(), loaded);
      } catch (error) {
        console.error(`Error: The file '${this.filename}' is not in JSON format.`);
        this.data = new CacheContent();
      }
    } else {
      console.warn(`Warning: The file '${this.filename}' does not exist. Local memory would not be saved to a file.`);
      this.data = new CacheContent();
    }
  }

  async add(text) {
    if (text.includes("Command Error:")) {
      return "";
    }
    try {
      this.data.texts.push(text);
      const embedding = await getAdaEmbedding(text);

      const vector = np.array(embedding, "float32").reshape([1, -1]).tolist();
      this.data.embeddings = np.concatenate([this.data.embeddings, vector], 0).tolist();

      const out = orjson.stringify(this.data);
      fs.writeFileSync(this.filename, out, "utf-8");

      return text;
    } catch (error) {
      console.error("Error: failed saving to memory", error);
      return "";
    }
  }

  clear() {
    this.data = new CacheContent();
    return "Obliviated";
  }

  get(data) {
    return this.getRelevant(data, 1);
  }

  async getRelevant(text, k) {
    const embedding = await getAdaEmbedding(text);

    const scores = np.dot(this.data.embeddings, embedding).tolist();

    const topKIndices = scores.sort().slice(-k).reverse();

    return topKIndices.map((i) => this.data.texts[i]);
  }

  getStats() {
    return [this.data.texts.length, this.data.embeddings.shape];
  }
}

export { LocalCache };
