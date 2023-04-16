import fs from "node:fs";
import path from "path";
import yaml from "js-yaml";
import { getPrompt } from "./prompt";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

type AIConfigProperties = {
  aiName: string;
  aiRole: string;
  aiGoals: string[];
};
const DEFAULTS: AIConfigProperties = { aiName: "", aiRole: "", aiGoals: [] };
class AIConfig {
  aiName: AIConfigProperties["aiName"];
  aiRole: AIConfigProperties["aiRole"];
  aiGoals: AIConfigProperties["aiGoals"];

  constructor({ aiName = "", aiRole = "", aiGoals = [] } = { ...DEFAULTS }) {
    this.aiName = aiName;
    this.aiRole = aiRole;
    this.aiGoals = aiGoals;
  }

  static SAVE_FILE = path.join(__dirname, "../..", "ai-settings.yaml");

  static load(configFile = AIConfig.SAVE_FILE) {
    let configParams = { ...DEFAULTS };

    try {
      configParams = yaml.load(fs.readFileSync(configFile, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    const aiName = configParams.aiName || "";
    const aiRole = configParams.aiRole || "";
    const aiGoals = configParams.aiGoals || [];

    return new AIConfig({ aiName, aiRole, aiGoals });
  }

  save(configFile = AIConfig.SAVE_FILE) {
    const config = {
      aiName: this.aiName,
      aiRole: this.aiRole,
      aiGoals: this.aiGoals,
    };

    fs.writeFileSync(configFile, yaml.dump(config));
  }

  constructFullPrompt() {
    const promptStart = `Your decisions must always be made independently without seeking user assistance. Play to your strengths as an LLM and pursue simple strategies with no legal complications.`;

    let fullPrompt = `You are ${this.aiName}, ${this.aiRole}\n${promptStart}\n\nGOALS:\n\n`;
    this.aiGoals.forEach((goal, i) => {
      fullPrompt += `${i + 1}. ${goal}\n`;
    });

    fullPrompt += `\n\n${getPrompt()}`;
    return fullPrompt;
  }
}

export { AIConfig };
