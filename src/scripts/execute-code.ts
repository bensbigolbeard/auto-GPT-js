import dockerode from "dockerode";
import path from "path";
import fs from "node:fs";

async function executeJsFile(file) {
  const workspaceFolder = "auto-gpt-workspace";

  console.log(`Executing file '${file}' in workspace '${workspaceFolder}'`);

  if (!file.endsWith(".js")) {
    return "Error: Invalid file type. Only .js files are allowed.";
  }

  const filePath = path.join(workspaceFolder, file);

  if (!fs.existsSync(filePath)) {
    return `Error: File '${file}' does not exist.`;
  }

  try {
    const docker = new dockerode();

    // You can replace 'node:16.13.0' with the desired Python image/version
    // You can find available Python images on Docker Hub:
    // https://hub.docker.com/_/python
    const container = await docker.createContainer({
      Image: "node:18.16.0",
      Cmd: ["node", file],
      Volumes: {
        "/workspace": {},
      },
      HostConfig: {
        Binds: [`${path.resolve(workspaceFolder)}:/workspace:ro`],
      },
      WorkingDir: "/workspace",
    });

    await container.start();

    const output = await container.wait();
    const logsStream = await container.logs({ stdout: true, stderr: true });

    const logs = await new Promise((resolve) => {
      let logsData = "";
      logsStream.on("data", (chunk) => {
        logsData += chunk.toString("utf-8");
      });
      logsStream.on("end", () => {
        resolve(logsData);
      });
    });

    await container.remove();

    return logs;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

export { executeJsFile };
