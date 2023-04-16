import { Config } from "../config";
import { MemoryProviderSingleton, getAdaEmbedding } from "./memory-base";
import { PineconeClient } from "@pinecone-database/pinecone";

const pinecone = new PineconeClient();
type PineconeIndex = ReturnType<typeof pinecone.Index>;
let NAMESPACES = {
  DEFAULT: "default",
};

class PineconeMemory extends MemoryProviderSingleton {
  vecNum: number = 0;
  index: PineconeIndex;
  tableName: string;

  constructor(cfg: Config) {
    super();
    const self = this;

    const dimension = 1536;
    const metric = "cosine";
    const podType = "p1";
    this.tableName = cfg.pineconeTableName || "auto-gpt";

    const pineconeApiKey = cfg.pineconeApiKey;
    const pineconeRegion = cfg.pineconeRegion;

    if (!pineconeApiKey || !pineconeRegion) {
      throw new Error("Missing pineconeApiKey or pineconeRegion");
    }

    NAMESPACES = {
      ...NAMESPACES,
      ...(cfg.pineconeNamespaces || []).reduce((acc, ns) => {
        acc[ns.toUpperCase().trim()] = ns;
        return acc;
      }, {}),
    };

    pinecone.init({ apiKey: pineconeApiKey, environment: pineconeRegion }).then(async () => {
      if (!(await pinecone.listIndexes()).includes(self.tableName)) {
        pinecone.createIndex({
          createRequest: { name: self.tableName, dimension, metric, podType },
        });
      }

    });
  }
  getIndex() {
    this.index = this.index || pinecone.Index(this.tableName);
    return this.index;
  }

  async add(data, namespace?: typeof NAMESPACES) {
    const values = await getAdaEmbedding(data);
    const resp = await this.getIndex().upsert({
      upsertRequest: {
        vectors: [{ id: String(this.vecNum), values, metadata: { raw_text: data } }],
        namespace: (namespace || NAMESPACES.DEFAULT) as string,
      },
    });
    const text = `Inserting data into memory at index: ${this.vecNum}:\n data: ${data}`;
    this.vecNum += 1;
    return text;
  }

  get(data) {
    return this.getRelevant(data, 1);
  }

  async clear() {
    await this.getIndex().delete1({ deleteAll: true });
    return "Obliviated";
  }

  async getRelevant(data, numRelevant = 5, namespace = NAMESPACES.DEFAULT) {
    const queryEmbedding = await getAdaEmbedding(data);
    const results = await this.getIndex().query({
      queryRequest: {
        vector: queryEmbedding,
        topK: numRelevant,
        includeMetadata: true,
        namespace,
      },
    });
    const sortedResults = results.matches?.sort((a, b) => (a.score ?? 0) - (b.score ?? 0)) ?? [];
    // @ts-ignore-next-line: Pinecone types are bad and they should feel bad
    return sortedResults.map((item) => item.metadata?.raw_text);
  }

  getStats() {
    return this.getIndex().describeIndexStats({ describeIndexStatsRequest: {} });
  }
}

export { PineconeMemory };
