import { writeFile } from "fs";
import { join, basename, dirname, normalize, sep } from "path";
import prismaPhpConfigJson from "../prisma-php.json";
import { getFileMeta } from "./utils.js";
import { promises as fsPromises } from "fs";
import { updateAllClassLogs } from "./class-log";
import { updateComponentImports } from "./class-imports";
import { generateFileListJson } from "./files-list";

const { __dirname } = getFileMeta();

const newProjectName = basename(join(__dirname, ".."));

// Function to update the project name and paths in the JSON config
function updateProjectNameInConfig(
  filePath: string,
  newProjectName: string
): void {
  const filePathDir = dirname(filePath);

  // Update the projectName directly in the imported config
  prismaPhpConfigJson.projectName = newProjectName;

  // Update other paths
  prismaPhpConfigJson.projectRootPath = filePathDir;

  const targetPath = getTargetPath(
    filePathDir,
    prismaPhpConfigJson.phpEnvironment
  );

  prismaPhpConfigJson.bsTarget = `http://localhost${targetPath}`;
  prismaPhpConfigJson.bsPathRewrite["^/"] = targetPath;

  // Save the updated config back to the JSON file
  writeFile(
    filePath,
    JSON.stringify(prismaPhpConfigJson, null, 2),
    "utf8",
    (err) => {
      if (err) {
        console.error("Error writing the updated JSON file:", err);
        return;
      }
      console.log(
        "The project name, PHP path, and other paths have been updated successfully."
      );
    }
  );
}

// Function to determine the target path for browser-sync
function getTargetPath(fullPath: string, environment: string): string {
  const normalizedPath = normalize(fullPath);

  // Patch: if CI, return root ("/") as default target path
  if (process.env.CI === "true") {
    return "/";
  }

  const webDirectories: { [key: string]: string } = {
    XAMPP: join("htdocs"),
    WAMP: join("www"),
    MAMP: join("htdocs"),
    LAMP: join("var", "www", "html"),
    LEMP: join("usr", "share", "nginx", "html"),
    AMPPS: join("www"),
    UniformServer: join("www"),
    EasyPHP: join("data", "localweb"),
  };

  const webDir = webDirectories[environment.toUpperCase()];
  if (!webDir) {
    throw new Error(`Unsupported environment: ${environment}`);
  }

  const indexOfWebDir = normalizedPath
    .toLowerCase()
    .indexOf(normalize(webDir).toLowerCase());
  if (indexOfWebDir === -1) {
    throw new Error(`Web directory not found in path: ${webDir}`);
  }

  const startIndex = indexOfWebDir + webDir.length;
  const subPath = normalizedPath.slice(startIndex);
  const safeSeparatorRegex = new RegExp(
    sep.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"),
    "g"
  );
  const finalPath = subPath.replace(safeSeparatorRegex, "/") + "/";

  return finalPath;
}

// Path to your JSON configuration file (for saving changes)
const configFilePath = join(__dirname, "..", "prisma-php.json");

// Run the function with your config file path and the new project name
updateProjectNameInConfig(configFilePath, newProjectName);

export const deleteFilesIfExist = async (
  filePaths: string[]
): Promise<void> => {
  for (const filePath of filePaths) {
    try {
      await fsPromises.unlink(filePath);
      // console.log(`Deleted ${filePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        // Ignore error if file doesn't exist
        console.error(`Error deleting ${filePath}:`, error);
      }
    }

    // If the file is 'request-data.json', recreate it as an empty file
    if (filePath.endsWith("request-data.json")) {
      try {
        await fsPromises.writeFile(filePath, ""); // Create an empty file
        // console.log(`Created empty ${filePath}`);
      } catch (error) {
        console.error(`Error creating empty ${filePath}:`, error);
      }
    }
  }
};

export async function deleteDirectoriesIfExist(
  dirPaths: string[]
): Promise<void> {
  for (const dirPath of dirPaths) {
    try {
      await fsPromises.rm(dirPath, { recursive: true, force: true });
      console.log(`Deleted directory: ${dirPath}`);
    } catch (error) {
      console.error(`Error deleting directory (${dirPath}):`, error);
    }
  }
}

export const filesToDelete = [
  join(__dirname, "request-data.json"),
  join(__dirname, "class-log.json"),
  join(__dirname, "class-imports.json"),
];

export const dirsToDelete = [
  join(__dirname, "..", "caches"),
  join(__dirname, "..", ".pphp"),
];

await deleteFilesIfExist(filesToDelete);
await deleteDirectoriesIfExist(dirsToDelete);
await generateFileListJson();
await updateAllClassLogs();
await updateComponentImports();
