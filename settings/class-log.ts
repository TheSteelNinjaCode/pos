import { promises as fs } from "fs";
import path from "path";
import { Engine } from "php-parser";
import { getFileMeta } from "./utils.js";

const { __dirname } = getFileMeta();

const SRC_DIR = path.join(__dirname, "..", "src");
const LOG_FILE = path.join(__dirname, "class-log.json");
const IPHPX_INTERFACE = "IPHPX";
const PHPX_BASE_CLASS = "PHPX";

const parser = new Engine({
  parser: {
    php8: true,
    suppressErrors: true,
  },
  ast: {
    withPositions: false,
  },
});

async function loadLogData(): Promise<Record<string, any>> {
  try {
    const content = await fs.readFile(LOG_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveLogData(logData: Record<string, any>) {
  await fs.writeFile(LOG_FILE, JSON.stringify(logData, null, 2));
}

async function analyzePhpFile(filePath: string) {
  const code = await fs.readFile(filePath, "utf-8");

  try {
    // Parse the PHP file to AST
    const ast = parser.parseCode(code, filePath);

    const classesFound: {
      name: string;
      implementsIPHPX: boolean;
      extendsPHPX: boolean;
    }[] = [];

    function traverse(node: any) {
      if (Array.isArray(node)) {
        node.forEach(traverse);
      } else if (node && typeof node === "object") {
        if (node.kind === "class" && node.name?.name) {
          const className = node.name.name;

          let implementsIPHPX = false;
          let extendsPHPX = false;

          if (node.implements && Array.isArray(node.implements)) {
            implementsIPHPX = node.implements.some(
              (iface: any) => iface.name === IPHPX_INTERFACE
            );
          }

          if (node.extends && node.extends.name === PHPX_BASE_CLASS) {
            extendsPHPX = true;
          }

          classesFound.push({ name: className, implementsIPHPX, extendsPHPX });
        }

        for (const key in node) {
          if (node[key]) {
            traverse(node[key]);
          }
        }
      }
    }

    traverse(ast);

    return classesFound;
  } catch (error) {
    console.error(`Error parsing file: ${filePath}`, error);
    return [];
  }
}

async function guessFullClassName(filePath: string, className: string) {
  const srcDir = path.join(__dirname, "..", "src");
  const relativeFromSrc = path.relative(srcDir, filePath);
  const withoutExtension = relativeFromSrc.replace(/\.php$/, "");
  const parts = withoutExtension.split(path.sep);
  parts.pop();
  const namespace = parts.join("\\");

  return `${namespace}\\${className}`;
}

async function updateClassLogForFile(
  filePath: string,
  logData: Record<string, any>
) {
  const classes = await analyzePhpFile(filePath);
  for (const cls of classes) {
    if (cls.implementsIPHPX || cls.extendsPHPX) {
      const classFullName = await guessFullClassName(filePath, cls.name);
      const relativePath = path
        .relative(SRC_DIR, filePath)
        .replace(/\\/g, "\\");
      logData[classFullName] = {
        filePath: relativePath,
      };
    }
  }
}

export async function updateAllClassLogs() {
  const logData = await loadLogData();

  // Get all PHP files in src
  async function getAllPhpFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await getAllPhpFiles(fullPath)));
      } else if (entry.isFile() && fullPath.endsWith(".php")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const phpFiles = await getAllPhpFiles(SRC_DIR);

  // Clear the log to rebuild it fresh each time (optional)
  for (const file of phpFiles) {
    await updateClassLogForFile(file, logData);
  }

  await saveLogData(logData);
  // console.log("class-log.json updated with all PHP files.");
}
