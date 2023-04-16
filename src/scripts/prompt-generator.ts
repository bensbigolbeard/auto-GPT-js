type PromptResponseFormat = {
  thoughts: {
    text: string;
    reasoning: string;
    plan: string;
    criticism: string;
    speak: string;
  };
  command: { label: string; name: string; args: Record<string, string> };
};

class PromptGenerator {
  constraints: string[];
  commands: { label: string; name: string; args: Record<string, string> }[];
  resources: string[];
  performanceEvaluation: string[];
  responseFormat: PromptResponseFormat;

  constructor() {
    this.constraints = [];
    this.commands = [];
    this.resources = [];
    this.performanceEvaluation = [];
    this.responseFormat = {
      thoughts: {
        text: "thought",
        reasoning: "reasoning",
        plan: "- short bulleted\n- list that conveys\n- long-term plan",
        criticism: "constructive self-criticism",
        speak: "thoughts summary to say to user",
      },
      command: {
        label: "command label",
        name: "command name",
        args: {
          "arg name": "value",
        },
      },
    };
  }

  addConstraint(constraint) {
    this.constraints.push(constraint);
  }

  addCommand(commandLabel, commandName, args = {}) {
    const commandArgs = { ...args };

    const command = {
      label: commandLabel,
      name: commandName,
      args: commandArgs,
    };

    this.commands.push(command);
  }

  _generateCommandString(command) {
    const argsString = Object.entries(command.args)
      .map(([key, value]) => `"${key}": "${value}"`)
      .join(", ");
    return `${command.label}: "${command.name}", args: ${argsString}`;
  }

  addResource(resource: string) {
    this.resources.push(resource);
  }

  addPerformanceEvaluation(evaluation) {
    this.performanceEvaluation.push(evaluation);
  }

  _generateNumberedList(items, itemType = "list") {
    return items
      .map((item, index) => {
        if (itemType === "command") {
          return `${index + 1}. ${this._generateCommandString(item)}`;
        } else {
          return `${index + 1}. ${item}`;
        }
      })
      .join("\n");
  }

  generatePromptString() {
    const formattedResponseFormat = JSON.stringify(this.responseFormat, null, 4);
    const promptString =
      `Constraints:\n${this._generateNumberedList(this.constraints)}\n\n` +
      `Commands:\n${this._generateNumberedList(this.commands, "command")}\n\n` +
      `Resources:\n${this._generateNumberedList(this.resources)}\n\n` +
      `Performance Evaluation:\n${this._generateNumberedList(this.performanceEvaluation)}\n\n` +
      `You should only respond in JSON format as described below \nResponse Format: \n${formattedResponseFormat} \nEnsure the response can be parsed by JSON.parse`;

    return promptString;
  }
}
export { PromptGenerator };
export type { PromptResponseFormat };
