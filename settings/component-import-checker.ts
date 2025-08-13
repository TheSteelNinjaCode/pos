import { promises as fs } from "fs";
import chalk from "chalk";

function removeAllHeredocs(code: string): string {
  const heredocRegex =
    /<<<\s*['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?\s*\n[\s\S]*?\n[ \t]*\1;?/g;
  return code.replace(heredocRegex, "");
}

function removePhpComments(code: string): string {
  code = code.replace(/\/\*[\s\S]*?\*\//g, "");
  code = code.replace(/\/\/.*$/gm, "");
  return code;
}

function findComponentsInFile(code: string): string[] {
  const cleanedCode = removePhpComments(removeAllHeredocs(code));
  const componentRegex = /<([A-Z][A-Za-z0-9]*)\b/g;
  const components = new Set<string>();
  let match;
  while ((match = componentRegex.exec(cleanedCode)) !== null) {
    components.add(match[1]);
  }
  return Array.from(components);
}

export async function checkComponentImports(
  filePath: string,
  fileImports: Record<
    string,
    | Array<{ className: string; filePath: string; importer?: string }>
    | { className: string; filePath: string; importer?: string }
  >
) {
  const code = await fs.readFile(filePath, "utf-8");
  const usedComponents = findComponentsInFile(code);
  // Normalize the current file path: replace backslashes, trim, remove trailing slash, and lower-case.
  const normalizedFilePath = filePath
    .replace(/\\/g, "/")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();

  usedComponents.forEach((component) => {
    const rawMapping = fileImports[component];
    // Normalize rawMapping to an array
    let mappings: Array<{
      className: string;
      filePath: string;
      importer?: string;
    }> = [];
    if (Array.isArray(rawMapping)) {
      mappings = rawMapping;
    } else if (rawMapping) {
      mappings = [rawMapping];
    }

    // Check if any mapping's importer matches the current file.
    const found = mappings.some((mapping) => {
      const normalizedImporter = (mapping.importer || "")
        .replace(/\\/g, "/")
        .trim()
        .replace(/\/+$/, "")
        .toLowerCase();
      // Either exact match or the current file path ends with the importer.
      return (
        normalizedFilePath === normalizedImporter ||
        normalizedFilePath.endsWith(normalizedImporter)
      );
    });
    if (!found) {
      console.warn(
        chalk.yellow("Warning: ") +
          chalk.white("Component ") +
          chalk.redBright(`<${component}>`) +
          chalk.white(" is used in ") +
          chalk.blue(filePath) +
          chalk.white(" but not imported.")
      );
    }
  });
}
