import { existsSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, sep, relative } from "path";
import { getFileMeta } from "./utils.js";

const { __dirname } = getFileMeta();

// Define the directory and JSON file paths correctly
const dirPath = "src/app"; // Directory path
const jsonFilePath = "settings/files-list.json"; // Path to the JSON file

// Function to get all files in the directory
const getAllFiles = (dirPath: string): string[] => {
  const files: string[] = [];

  // Check if directory exists before reading
  if (!existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return files; // Return an empty array if the directory doesn't exist
  }

  const items = readdirSync(dirPath);
  items.forEach((item) => {
    const fullPath = join(dirPath, item);
    if (statSync(fullPath).isDirectory()) {
      files.push(...getAllFiles(fullPath)); // Recursive call for subdirectories
    } else {
      // Generate the relative path and ensure it starts with ./src
      const relativePath = `.${sep}${relative(
        join(__dirname, ".."),
        fullPath
      )}`;
      // Replace only the root backslashes with forward slashes and leave inner ones
      files.push(relativePath.replace(/\\/g, "/").replace(/^\.\.\//, ""));
    }
  });

  return files;
};

// Function to generate the files-list.json
export const generateFileListJson = async (): Promise<void> => {
  const files = getAllFiles(dirPath);

  // If files exist, generate JSON file
  if (files.length > 0) {
    writeFileSync(jsonFilePath, JSON.stringify(files, null, 2));
    // console.log(`File list has been saved to: ${jsonFilePath}`);
  } else {
    console.error("No files found to save in the JSON file.");
  }
};
