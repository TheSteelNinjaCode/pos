import path, { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import psdk from "@prisma/internals";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { getDMMF } = psdk;
const schemaPath: string = resolve(__dirname, "../prisma/schema.prisma");
const prismaSchemaJsonPath: string = resolve(__dirname, "prisma-schema.json");

export const prismaSdk = async (): Promise<void> => {
  try {
    const schema = readFileSync(schemaPath, "utf-8");

    // Parse the schema into DMMF (Data Model Meta Format) and then convert to JSON
    const dmmf = await getDMMF({ datamodel: schema });

    // Write the DMMF schema to JSON
    writeFileSync(prismaSchemaJsonPath, JSON.stringify(dmmf, null, 2));
    console.log("Schema converted to JSON!");
  } catch (error) {
    console.error("Error parsing schema:", error);
  }
};

if (process.argv[1] && process.argv[1].endsWith("prisma-sdk.ts")) {
  prismaSdk();
}
