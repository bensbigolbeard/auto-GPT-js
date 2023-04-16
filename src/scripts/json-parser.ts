import { callAiFunction } from "./call-ai-function";
import { correctJson, cutToBraces } from "./json-utils";
import { Config } from "./config";
import * as logger from "./logger";

const cfg = new Config();

const JSON_SCHEMA = `
    {
      "command": {
        "name": "command name",
        "args": {
          "arg name": "value"
        }
      },
      "thoughts": {
        "text": "thought",
        "reasoning": "reasoning",
        "plan": "- short bulleted\n- list that conveys\n- long-term plan",
        "criticism": "constructive self-criticism",
        "speak": "thoughts summary to say to user"
      }
    }
  `;

async function fixAndParseJson<T>(jsonStr, tryToFixWithGpt = true): Promise<T | never> {
  const jsonTransformations = [
    (jsonString) => jsonString,
    (jsonString) => jsonString.replace("\t", ""),
    correctJson,
    cutToBraces,
  ];

  if (tryToFixWithGpt) {
    jsonTransformations.push((str) => _fixJsonWithAi(str));
  }

  let lastError = null;
  for (const transformation of jsonTransformations) {
    try {
      jsonStr = await transformation(jsonStr);
      return JSON.parse(jsonStr);
    } catch (err) {
      lastError = err;
      logger.log({ title: `Failed to parse JSON after transformation:\n${JSON.stringify(jsonStr)}`, level: "error" });
    }
  }

  logger.log({ title: "Failed to fix AI output, telling the AI.##" + typeof jsonStr, level: "error" });
  throw lastError;
}

async function _fixJsonWithAi(jsonStr) {
  logger.log({
    title:
      "Warning: Failed to parse AI output, attempting to fix." +
      "\n If you see this warning frequently, it is likely that" +
      " your prompt is confusing the AI. Try changing it up" +
      " slightly." +
      typeof jsonStr,
    level: "warn",
  });

  const functionString = "function fixJson(jsonStr: string, schema: string | null = null): string {";
  const args = [`'${jsonStr}'`, `'${JSON_SCHEMA}'`];
  const descriptionString =
    "Fixes the provided JSON string to make it parseable" +
    " and fully compliant with the provided schema.\n If an object or" +
    " field specified in the schema is not contained within the correct" +
    " JSON, it is omitted.\n This function is brilliant at guessing" +
    " when the format is incorrect.";

  if (!jsonStr.startsWith("`")) {
    jsonStr = "```json\n" + jsonStr + "\n```";
  }
  const resultString = await callAiFunction(functionString, args, descriptionString, cfg.fastLlmModel);

  logger.log({ title: "------------ JSON FIX ATTEMPT ---------------" });
  logger.log({ title: `Original JSON: ${jsonStr}` });
  logger.log({ title: "-----------" });
  logger.log({ title: `Fixed JSON: ${resultString}` });
  logger.log({ title: "----------- END OF FIX ATTEMPT ----------------" });

  try {
    JSON.parse(resultString);
    return resultString;
  } catch (e) {
    return "failed";
  }
}

export { fixAndParseJson };
