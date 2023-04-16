import fs from "node:fs";
import path from "path";

const workingDirectory = "auto-gpt-workspace";

if (!fs.existsSync(workingDirectory)) {
  fs.mkdirSync(workingDirectory, { recursive: true });
}

function safeJoin(base, ...paths) {
  const newPath = path.join(base, ...paths);
  const normNewPath = path.normalize(newPath);
  const isExternalDir = !!normNewPath.replace(base, "").replace("/", "");

  if (isExternalDir) {
    throw new Error("Attempted to access outside of working directory.");
  }

  return normNewPath;
}

function readFile(filename) {
  try {
    const filepath = safeJoin(workingDirectory, filename);
    const content = fs.readFileSync(filepath, "utf-8");
    return content;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

function writeToFile(filename, text) {
  try {
    const filepath = safeJoin(workingDirectory, filename);
    const directory = path.dirname(filepath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    fs.writeFileSync(filepath, text, "utf-8");
    return "File written to successfully.";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

function appendToFile(filename, text) {
  try {
    const filepath = safeJoin(workingDirectory, filename);
    fs.appendFileSync(filepath, text);
    return "Text appended successfully.";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

function deleteFile(filename) {
  try {
    const filepath = safeJoin(workingDirectory, filename);
    fs.unlinkSync(filepath);
    return "File deleted successfully.";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

function searchFiles(directory) {
  const foundFiles: string[] = [];

  let searchDirectory = workingDirectory;
  if (directory !== "" && directory !== "/") {
    searchDirectory = safeJoin(workingDirectory, directory);
  }

  const files = fs.readdirSync(searchDirectory, { withFileTypes: true });

  for (const file of files) {
    if (file.isFile() && !file.name.startsWith(".")) {
      const relativePath = path.relative(workingDirectory, path.join(searchDirectory, file.name));
      foundFiles.push(relativePath);
    }
  }

  return foundFiles;
}

export { readFile, writeToFile, appendToFile, deleteFile, searchFiles };
