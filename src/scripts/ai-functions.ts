import { callAiFunction } from "./call-ai-function";

async function evaluateCode(code: string) {
  const functionString = "function analyzeCode(code: string): string[] {";
  const args = [code];
  const descriptionString = "Analyzes the given code and returns a list of suggestions for improvements.";

  const resultString = await callAiFunction(functionString, args, descriptionString);

  return resultString;
}

async function improveCode(suggestions: string[], code: string) {
  const functionString = "function generateImprovedCode(suggestions: string[], code: string): string {";
  const args = [JSON.stringify(suggestions), code];
  const descriptionString = "Improves the provided code based on the suggestions provided, making no other changes.";

  const resultString = await callAiFunction(functionString, args, descriptionString);

  return resultString;
}

async function writeTests(code: string, focus: string | null = null) {
  const functionString = "function createTestCases(code: string, focus?: string | null = null): string {";
  const args = [code, JSON.stringify(focus)];
  const descriptionString = "Generates test cases for the existing code, focusing on specific areas if required.";

  const resultString = await callAiFunction(functionString, args, descriptionString);

  return resultString;
}

export { evaluateCode, improveCode, writeTests };
