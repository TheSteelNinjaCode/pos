import { join } from "path";
import { generateFileListJson } from "./files-list.js";
import { updateAllClassLogs } from "./class-log.js";
import {
  deleteFilesIfExist,
  filesToDelete,
  deleteDirectoriesIfExist,
  dirsToDelete,
} from "./project-name.js";
import {
  analyzeImportsInFile,
  getAllPhpFiles,
  SRC_DIR,
  updateComponentImports,
} from "./class-imports";
import { checkComponentImports } from "./component-import-checker";

(async () => {
  console.log("📦 Generating files for production...");

  // 1) Run all watchers logic ONCE
  await deleteFilesIfExist(filesToDelete);
  await deleteDirectoriesIfExist(dirsToDelete);
  await generateFileListJson();
  await updateAllClassLogs();
  await updateComponentImports();

  // 2) Process all PHP files for component-import checks
  const phpFiles = await getAllPhpFiles(join(SRC_DIR, "app"));
  for (const file of phpFiles) {
    const rawFileImports = await analyzeImportsInFile(file);

    // Normalize imports into array-of-objects format
    const fileImports: Record<
      string,
      { className: string; filePath: string; importer?: string }[]
    > = {};

    for (const key in rawFileImports) {
      const val = rawFileImports[key];
      if (typeof val === "string") {
        fileImports[key] = [{ className: key, filePath: val }];
      } else {
        fileImports[key] = val;
      }
    }

    await checkComponentImports(file, fileImports);
  }

  console.log("✅ Generating files for production completed.");
})();
