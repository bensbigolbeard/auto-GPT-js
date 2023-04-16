import * as readline from "readline";

function cleanInput(prompt = ""): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });

    rl.on("SIGINT", () => {
      console.log("You interrupted Auto-GPT");
      console.log("Quitting...");
      process.exit(0);
    });
  });
}

export { cleanInput };
