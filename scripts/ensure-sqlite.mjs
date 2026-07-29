import { closeSync, mkdirSync, openSync } from "node:fs";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.startsWith("file:")) {
  throw new Error("DATABASE_URL debe ser una URL SQLite con prefijo file:.");
}

const location = databaseUrl.slice("file:".length);
const databasePath = path.isAbsolute(location)
  ? location
  : path.resolve(process.cwd(), "prisma", location);

mkdirSync(path.dirname(databasePath), { recursive: true });
closeSync(openSync(databasePath, "a"));

console.info(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    event: "sqlite.prepared",
    path: databasePath
  })
);
