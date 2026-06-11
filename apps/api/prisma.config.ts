import "dotenv/config";
import { defineConfig } from "prisma";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://localhost/parkswift_dev",
    },
  },
  migrations: {
    path: "./prisma/migrations",
  },
});
