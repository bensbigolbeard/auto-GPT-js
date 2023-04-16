import { Config } from "../config";
import { MemoryProviderSingleton, getAdaEmbedding } from "./memory-base";
import Redis from "ioredis";

class RedisMemory extends MemoryProviderSingleton {
  dimension: number;
  redis: any;
  cfg: Config;
  vecNum: number;

  constructor(cfg) {
    super();

    const redisHost = cfg.redisHost;
    const redisPort = cfg.redisPort;
    const redisPassword = cfg.redisPassword;

    if (!redisHost || !redisPort || !redisPassword) {
      throw new Error("Missing Redis configuration");
    }
    this.dimension = 1536;
    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
    });
    this.cfg = cfg;

    if (cfg.wipeRedisOnStart) {
      this.redis.flushall();
    }

    this.redis.on("error", (err) => {
      console.error("Error creating Redis search index: ", err);
    });

    // NOTE: find replacement for Redisearch in node
    // Redisearch.init(this.redis);
    // const search = new Redisearch(cfg.memoryIndex);

    // search
    //   .createIndex({
    //     definition: {
    //       prefix: [`${cfg.memoryIndex}:`],
    //       type: "HASH",
    //     },
    //     fields: [
    //       { name: "data", type: "TEXT" },
    //       {
    //         name: "embedding",
    //         type: "VECTOR",
    //         options: {
    //           distanceMetric: "COSINE",
    //           type: "FLOAT32",
    //           dim: 1536,
    //         },
    //       },
    //     ],
    //   })
    //   .catch((err) =>
    //     console.error("Error creating Redis search index: ", err)
    //   );

    this.vecNum = 0;
  }

  async add(data) {
    if (data.includes("Command Error:")) {
      return "";
    }

    const vector = await getAdaEmbedding(data);
    const float32Vector = new Float32Array(vector);
    const buffer = float32Vector.buffer;
    const uint8Vector = new Uint8Array(buffer);

    const dataDict = {
      data: data,
      embedding: uint8Vector,
    };

    const pipe = this.redis.pipeline();
    pipe.hset(`${this.cfg.memoryIndex}:${this.vecNum}`, dataDict);
    const text = `Inserting data into memory at index: ${this.vecNum}:\ndata: ${data}`;
    this.vecNum += 1;
    pipe.set(`${this.cfg.memoryIndex}-vec_num`, this.vecNum);
    await pipe.exec();
    return text;
  }

  get(data) {
    return this.getRelevant(data, 1);
  }

  async clear() {
    await this.redis.flushall();
    return "Obliviated";
  }

  async getRelevant(data, numRelevant = 5) {
    const queryEmbedding = getAdaEmbedding(data);
    // const search = new Redisearch(this.cfg.memoryIndex);
    const baseQuery = `*=>[KNN ${numRelevant} @embedding $vector AS vector_score]`;

    // const query = search
    //   .query(baseQuery)
    //   .return("data", "vector_score")
    //   .sortBy("vector_score")
    //   .dialect(2);

    // const float32Vector = new Float32Array(queryEmbedding);
    // const buffer = float32Vector.buffer;
    // const uint8Vector = new Uint8Array(buffer);

    // try {
    //   const results = await search.search(query, { vector: uint8Vector });
    //   return results.docs.map((doc) => doc.data);
    // } catch (err) {
    console.error("Redis not currently supported: ");
    return [];
    // }
  }

  async getStats() {
    // const search = new Redisearch(this.cfg.memoryIndex);
    // const stats = await search.info();
    // return stats;
  }
}

export { RedisMemory };
