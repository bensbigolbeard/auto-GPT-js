import { Config } from "./config";
import { JSONPath } from "jsonpath-plus";

const cfg = new Config();

function extractCharPosition(errorMessage) {
  /* Extract the character position from the JSONDecodeError message. */

  const charPattern = /\(char (\d+)\)/;
  const match = errorMessage.match(charPattern);

  if (match) {
    return parseInt(match[1]);
  } else {
    throw new Error("Character position not found in the error message.");
  }
}

function addQuotesToPropertyNames(jsonString) {
  /* Add quotes to property names in a JSON string. */

  const replaceFunc = (match) => `"${match[1]}":`;
  const propertyNamePattern = /(\w+):/g;

  const correctedJsonString = jsonString.replace(propertyNamePattern, replaceFunc);

  try {
    JSON.parse(correctedJsonString);
    return correctedJsonString;
  } catch (e) {
    console.log("JSON parse error - add quotes:", e);
    throw e;
  }
}

const hasBalancedBraces = (str) => {
  const openBracesCount = (str.match(/\{/g) || []).length;
  const closeBracesCount = (str.match(/\}/g) || []).length;
  return { isBalanced: openBracesCount === closeBracesCount, openBracesCount, closeBracesCount };
};
function balanceBraces(jsonString: string): string | null {
  /* Balance the braces in a JSON string. */
  let { openBracesCount, closeBracesCount } = hasBalancedBraces(jsonString);

  while (openBracesCount > closeBracesCount) {
    jsonString += "}";
    closeBracesCount += 1;
  }

  while (closeBracesCount > openBracesCount) {
    jsonString = jsonString.trim().replace(/\\}+$/, "");
    closeBracesCount -= 1;
  }

  try {
    JSON.parse(jsonString);
    return jsonString;
  } catch (e) {
    console.log("JSON parse error - balance braces:", e);
    return null;
  }
}

function fixInvalidEscape(jsonString: string, errorMessage: string) {
  /* Fix invalid escape characters in a JSON string. */

  while (errorMessage.startsWith("Invalid \\escape")) {
    const badEscapeLocation = extractCharPosition(errorMessage);
    jsonString = jsonString.slice(0, badEscapeLocation) + jsonString.slice(badEscapeLocation + 1);
    try {
      JSON.parse(jsonString);
      return jsonString;
    } catch (e) {
      if (cfg.debugMode) {
        console.error("JSON parse error - fix invalid escape:", e);
      }
      errorMessage = e.message;
    }
  }

  return jsonString;
}

function correctJson(jsonString: string) {
  /* Correct common JSON errors. */

  try {
    if (cfg.debugMode) {
      console.log("JSON:", jsonString);
    }
    JSON.parse(jsonString);
    return jsonString;
  } catch (e) {
    if (cfg.debugMode) {
      console.error("JSON parse error:", e);
    }
    let errorMessage: string = e.message;
    if (errorMessage.startsWith("Invalid \\escape")) {
      jsonString = fixInvalidEscape(jsonString, errorMessage);
    }
    if (errorMessage.startsWith("Expecting property name enclosed in double quotes")) {
      jsonString = addQuotesToPropertyNames(jsonString);
      try {
        JSON.parse(jsonString);
        return jsonString;
      } catch (e) {
        if (cfg.debugMode) {
          console.error("JSON parse error - add quotes:", e);
        }
        errorMessage = e.message;
      }
    }
    const balancedString = balanceBraces(jsonString);
    if (balancedString) {
      return balancedString;
    }
  }
  return jsonString;
}

function cutToBraces(jsonStr) {
  const braceIndex = jsonStr.indexOf("{");
  jsonStr = jsonStr.slice(braceIndex);
  const lastBraceIndex = jsonStr.lastIndexOf("}");
  jsonStr = jsonStr.slice(0, lastBraceIndex + 1);
  return jsonStr;
}

async function attemptToFixJsonByFindingOutermostBrackets(jsonString) {
  let cleanedJsonString = cutToBraces(jsonString);
  let isValid = hasBalancedBraces(cleanedJsonString).isBalanced;
  if (!isValid) {
    cleanedJsonString = "{}";
  }

  return { isValid, jsonString: cleanedJsonString };
}

export { correctJson, cutToBraces, attemptToFixJsonByFindingOutermostBrackets, JSONPath };
