import { createProxyMiddleware } from "http-proxy-middleware";
import { writeFileSync } from "fs";
import browserSync, { BrowserSyncInstance } from "browser-sync";
import prismaPhpConfigJson from "../prisma-php.json";
import { generateFileListJson } from "./files-list.js";
import { join } from "path";
import { getFileMeta } from "./utils.js";
import { updateAllClassLogs } from "./class-log.js";
import {
  analyzeImportsInFile,
  getAllPhpFiles,
  SRC_DIR,
  updateComponentImports,
} from "./class-imports";
import { checkComponentImports } from "./component-import-checker";
import { DebouncedWorker, createSrcWatcher, DEFAULT_AWF } from "./utils.js";

const { __dirname } = getFileMeta();

const bs: BrowserSyncInstance = browserSync.create();

// ---------- Watcher (whole ./src) ----------
const pipeline = new DebouncedWorker(
  async () => {
    await generateFileListJson();
    await updateAllClassLogs();
    await updateComponentImports();

    // Scan all PHP files in the whole SRC tree
    const phpFiles = await getAllPhpFiles(SRC_DIR);
    for (const file of phpFiles) {
      const rawFileImports = await analyzeImportsInFile(file);

      // Normalize to array-of-objects shape expected by the checker
      const fileImports: Record<
        string,
        { className: string; filePath: string; importer?: string }[]
      > = {};
      for (const key in rawFileImports) {
        const v = rawFileImports[key];
        fileImports[key] = Array.isArray(v)
          ? v
          : [{ className: key, filePath: v }];
      }
      await checkComponentImports(file, fileImports);
    }
  },
  350,
  "bs-pipeline"
);

// watch the entire src; we don’t need an extension filter here
createSrcWatcher(join(SRC_DIR, "**", "*"), {
  onEvent: (_ev, _abs, rel) => pipeline.schedule(rel),
  awaitWriteFinish: DEFAULT_AWF,
  logPrefix: "watch",
  usePolling: true,
  interval: 1000,
});

// ---------- BrowserSync ----------
bs.init(
  {
    /**
     * Proxy your PHP app (from prisma-php.json).
     * Use object form to enable WebSocket proxying.
     */
    proxy: "http://localhost:3000",

    middleware: [
      (_req, res, next) => {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        next();
      },

      createProxyMiddleware({
        target: prismaPhpConfigJson.bsTarget,
        changeOrigin: true,
        pathRewrite: {},
      }),
    ],

    files: `${SRC_DIR}/**/*.*`, // still do file-level reloads as a safety net
    notify: false,
    open: false,
    ghostMode: false,
    codeSync: true, // Disable synchronization of code changes across clients
    watchOptions: {
      usePolling: true,
      interval: 1000,
    },
  },
  (err, bsInstance) => {
    if (err) {
      console.error("BrowserSync failed to start:", err);
      return;
    }

    // Write live URLs for other tooling
    const urls = bsInstance.getOption("urls");
    const out = {
      local: urls.get("local"),
      external: urls.get("external"),
      ui: urls.get("ui"),
      uiExternal: urls.get("ui-external"),
    };

    writeFileSync(
      join(__dirname, "bs-config.json"),
      JSON.stringify(out, null, 2)
    );
    console.log("\n\x1b[90mPress Ctrl+C to stop.\x1b[0m\n");
  }
);
