import { defineConfig } from "prisma/config";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";

if (!process.env.DATABASE_URL && existsSync(".env")) {
  loadEnvFile();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  }
});
