import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" }
    ]
  });

  client.$on("error", (e) => {
    logger.error("Prisma error occurred", { message: e.message, target: e.target });
  });

  client.$on("warn", (e) => {
    logger.warn("Prisma warning occurred", { message: e.message });
  });

  return client;
};

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
