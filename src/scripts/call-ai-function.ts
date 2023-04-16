import { Config } from "./config";
import { createChatCompletion } from "./llm-utils";
import type { ChatCompletionInputs } from "./llm-utils";

const cfg = new Config();

const callAiFunction = (
  functionName: string,
  args: string[],
  description: string,
  model: string | null = null
): Promise<string> => {
  model = model ?? cfg.smartLlmModel;

  // Parse args to comma-separated string
  const argsStr = args.map(String).join(", ");
  const messages: ChatCompletionInputs["messages"] = [
    {
      role: "system",
      content: `You are now the following python function: \`\`\`// ${description}\n${functionName}\`\`\`\n\nOnly respond with your \`return\` value.`,
    },
    { role: "user", content: argsStr },
  ];

  return createChatCompletion({
    model: model,
    messages: messages,
    temperature: 0,
  });
};

export { callAiFunction };
