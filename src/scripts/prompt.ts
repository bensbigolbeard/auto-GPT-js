import { PromptGenerator } from "./prompt-generator";

const getPrompt = () => {
  const promptGenerator = new PromptGenerator();

  // Add constraints to the PromptGenerator object
  promptGenerator.addConstraint(
    "~4000 word limit for short term memory. Your short term memory is short, so immediately save important information to files."
  );
  promptGenerator.addConstraint(
    "If you are unsure how you previously did something or want to recall past events, thinking about similar events will help you remember."
  );
  promptGenerator.addConstraint("No user assistance");
  promptGenerator.addConstraint('Exclusively use the commands listed in double quotes e.g. "command name"');

  // Define the command list
  const commands = [
    ["Google Search", "google", { input: "<search>" }],
    ["Browse Website", "browseWebsite", { url: "<url>", question: "<what_you_want_to_find_on_website>" }],
    ["Start GPT Agent", "startAgent", { name: "<name>", task: "<short_task_desc>", prompt: "<prompt>" }],
    ["Message GPT Agent", "messageAgent", { key: "<key>", message: "<message>" }],
    ["List GPT Agents", "listAgents", {}],
    ["Delete GPT Agent", "deleteAgent", { key: "<key>" }],
    ["Write to file", "writeToFile", { file: "<file>", text: "<text>" }],
    ["Read file", "readFile", { file: "<file>" }],
    ["Append to file", "appendToFile", { file: "<file>", text: "<text>" }],
    ["Delete file", "deleteFile", { file: "<file>" }],
    ["Search Files", "searchFiles", { directory: "<directory>" }],
    ["Evaluate Code", "evaluateCode", { code: "<full_code_string>" }],
    ["Get Improved Code", "improveCode", { suggestions: "<list_of_suggestions>", code: "<full_code_string>" }],
    ["Write Tests", "writeTests", { code: "<full_code_string>", focus: "<list_of_focus_areas>" }],
    ["Execute Python File", "executePythonFile", { file: "<file>" }],
    ["Execute Shell Command, non-interactive commands only", "execuCte_shell", { command_line: "<command_line>" }],
    ["Task Complete (Shutdown)", "taskComplete", { reason: "<reason>" }],
    ["Generate Image", "generateImage", { prompt: "<prompt>" }],
    ["Do Nothing", "doNothing", {}],
  ];

  // Add commands to the PromptGenerator object
  commands.forEach(([commandLabel, commandName, args]) => {
    promptGenerator.addCommand(commandLabel, commandName, args);
  });

  // Add resources to the PromptGenerator object
  promptGenerator.addResource("Internet access for searches and information gathering.");
  promptGenerator.addResource("Long Term memory management.");
  promptGenerator.addResource("GPT-3.5 powered Agents for delegation of simple tasks.");
  promptGenerator.addResource("File output.");

  // Add performance evaluations to the PromptGenerator object
  promptGenerator.addPerformanceEvaluation(
    "Continuously review and analyze your actions to ensure you are performing to the best of your abilities."
  );
  promptGenerator.addPerformanceEvaluation("Constructively self-criticize your big-picture behavior constantly.");
  promptGenerator.addPerformanceEvaluation("Reflect on past decisions and strategies to refine your approach.");
  promptGenerator.addPerformanceEvaluation(
    "Every command has a cost, so be smart and efficient. Aim to complete tasks in the least number of steps."
  );

  // Generate the prompt string
  const promptString = promptGenerator.generatePromptString();

  return promptString;
};

export { getPrompt };
