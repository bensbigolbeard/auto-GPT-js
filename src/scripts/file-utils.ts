import fs from "node:fs";
import path from "path";

const workingDirectory = "auto-gpt-workspace";

if (!fs.existsSync(workingDirectory)) {
  fs.mkdirSync(workingDirectory);
}

function safeJoin(base, ...paths) {
  const newPath = path.join(base, ...paths);
  const normNewPath = path.normalize(newPath);

  if (!normNewPath.startsWith(base)) {
    throw new Error("Attempted to access outside of working directory.");
  }

  return normNewPath;
}

function readFile(filename) {
  try {
    const filePath = safeJoin(workingDirectory, filename);
    const content = fs.readFileSync(filePath, "utf-8");
    return content;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

function writeToFile(filename, text) {
  try {
    const filePath = safeJoin(workingDirectory, filename);
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    fs.writeFileSync(filePath, text);
    return "File written to successfully.";
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

function appendToFile(filename, text) {
  try {
    const filePath = safeJoin(workingDirectory, filename);
    fs.appendFileSync(filePath, text);
    return "Text appended successfully.";
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

function deleteFile(filename) {
  try {
    const filePath = safeJoin(workingDirectory, filename);
    fs.unlinkSync(filePath);
    return "File deleted successfully.";
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

function searchFiles(directory) {
  const foundFiles: string[] = [];
  const searchDirectory =
    directory === "" || directory === "/" ? workingDirectory : safeJoin(workingDirectory, directory);

  function searchRecursively(currentDirectory) {
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(currentDirectory, entry.name);
      if (entry.isFile()) {
        const relativePath = path.relative(workingDirectory, fullPath);
        foundFiles.push(relativePath);
      } else if (entry.isDirectory()) {
        searchRecursively(fullPath);
      }
    }
  }

  searchRecursively(searchDirectory);

  return foundFiles;
}

export { readFile, writeToFile, appendToFile, deleteFile, searchFiles };
