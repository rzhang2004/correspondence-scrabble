import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // URL is read from env("DATABASE_URL") in schema.prisma
  // datasource.url here is only used as an override — omitting it lets
  // the schema's env() call handle both local and production environments
});
