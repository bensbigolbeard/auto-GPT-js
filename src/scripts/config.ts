import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

class Config {
  debugMode?: boolean;
  continuousMode?: boolean;
  continuousLimit?: number;
  speakMode?: boolean;
  fastLlmModel: string;
  smartLlmModel: string;
  fastTokenLimit: number;
  smartTokenLimit: number;
  openaiApiKey?: string;
  temperature: number;
  useAzure?: boolean;
  executeLocalCommands?: boolean;
  elevenlabsApiKey?: string;
  elevenlabsVoice1Id?: string;
  elevenlabsVoice2Id?: string;
  useMacOsTts?: boolean;
  googleApiKey?: string;
  customSearchEngineId?: string;
  pineconeApiKey?: string;
  pineconeRegion?: string;
  pineconeTableName?: string;
  pineconeNamespaces?: string[];
  imageProvider?: string;
  huggingfaceApiToken?: string;
  userAgentHeader: { "User-Agent": string };
  redisHost?: string;
  redisPort?: string;
  redisPassword?: string;
  wipeRedisOnStart?: boolean;
  memoryIndex: string;
  memoryBackend: string;

  constructor() {
    this.debugMode = false;
    this.continuousMode = false;
    this.speakMode = false;

    this.fastLlmModel = process.env.FAST_LLM_MODEL || "gpt-3.5-turbo";
    this.smartLlmModel = process.env.SMART_LLM_MODEL || "gpt-4";
    this.fastTokenLimit = parseInt(process.env.FAST_TOKEN_LIMIT || "4000");
    this.smartTokenLimit = parseInt(process.env.SMART_TOKEN_LIMIT || "8000");

    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.temperature = parseFloat(process.env.TEMPERATURE || "1");
    this.useAzure = process.env.USE_AZURE === "True";
    this.executeLocalCommands = process.env.EXECUTE_LOCAL_COMMANDS === "True";

    if (this.useAzure) {
      this.loadAzureConfig();
      // TODO: Initialize OpenAI API client with azure configurations
    }

    this.elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    this.elevenlabsVoice1Id = process.env.ELEVENLABS_VOICE_1_ID;
    this.elevenlabsVoice2Id = process.env.ELEVENLABS_VOICE_2_ID;

    this.useMacOsTts = process.env.USE_MAC_OS_TTS === "True";

    this.googleApiKey = process.env.GOOGLE_API_KEY;
    this.customSearchEngineId = process.env.CUSTOM_SEARCH_ENGINE_ID;

    this.pineconeApiKey = process.env.PINECONE_API_KEY;
    this.pineconeRegion = process.env.PINECONE_ENV;
    this.pineconeNamespaces = process.env.PINECONE_NAMESPACES;
    this.pineconeTableName = process.env.PINECONE_TABLE_NAME;

    this.imageProvider = process.env.IMAGE_PROVIDER;
    this.huggingfaceApiToken = process.env.HUGGINGFACE_API_TOKEN;

    this.userAgentHeader = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36",
    };
    this.redisHost = process.env.REDIS_HOST || "localhost";
    this.redisPort = process.env.REDIS_PORT || "6379";
    this.redisPassword = process.env.REDIS_PASSWORD || "";
    this.wipeRedisOnStart = process.env.WIPE_REDIS_ON_START === "True";
    this.memoryIndex = process.env.MEMORY_INDEX || "auto-gpt";

    this.memoryBackend = process.env.MEMORY_BACKEND || "local";
    // TODO: Initialize the OpenAI API client with the API key
  }
  AZURE_CONFIG_FILE: string;
  loadAzureConfig() {
    throw new Error("Method not implemented.");
  }
  getAzureDeploymentIdForModel(model) {
    // implement if using azure
    throw new Error("Method not implemented.");
  }

  setContinuousMode(value: boolean) {
    //Set the continuous mode value
    this.continuousMode = value;
  }

  setContinuousLimit(value = 0) {
    //Set the continuous limit value
    this.continuousLimit = value;
  }

  setSpeakMode(value: boolean) {
    //Set the speak mode value
    this.speakMode = value;
  }

  setFastLlmModel(value: string) {
    //Set the fast LLM model value
    this.fastLlmModel = value;
  }

  setSmartLlmModel(value: string) {
    //Set the smart LLM model value
    this.smartLlmModel = value;
  }

  setFastTokenLimit(value: number) {
    //Set the fast token limit value
    this.fastTokenLimit = value;
  }

  setSmartTokenLimit(value: number) {
    //Set the smart token limit value
    this.smartTokenLimit = value;
  }

  setOpenaiApiKey(value: string) {
    //Set the OpenAI API key value
    this.openaiApiKey = value;
  }

  setElevenlabsApiKey(value: string) {
    //Set the ElevenLabs API key value
    this.elevenlabsApiKey = value;
  }

  setElevenlabsVoice1Id(value: string) {
    //Set the ElevenLabs Voice 1 ID value
    this.elevenlabsVoice1Id = value;
  }

  setElevenlabsVoice2Id(value: string) {
    //Set the ElevenLabs Voice 2 ID value
    this.elevenlabsVoice2Id = value;
  }

  setGoogleApiKey(value: string) {
    //Set the Google API key value
    this.googleApiKey = value;
  }

  setCustomSearchEngineId(value: string) {
    //Set the custom search engine id value
    this.customSearchEngineId = value;
  }

  setPineconeApiKey(value: string) {
    //Set the Pinecone API key value
    this.pineconeApiKey = value;
  }

  setPineconeRegion(value: string) {
    //Set the Pinecone region value
    this.pineconeRegion = value;
  }

  setDebugMode(value: boolean) {
    //Set the debug mode value
    this.debugMode = value;
  }
}

export { Config };
