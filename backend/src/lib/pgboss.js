import PgBoss from "pg-boss";
import { logger } from "./logger.js";

let bossInstance = null;
let startPromise = null;

export function getBoss() {
  if (!bossInstance) {
    bossInstance = new PgBoss({
      connectionString: process.env.DATABASE_URL,
      application_name: "mytix_jobs",
      max: 10
    });

    bossInstance.on("error", (error) => {
      logger.error("pg-boss encountered error", { error: error.message });
    });
  }
  return bossInstance;
}

export async function ensureBossStarted() {
  const boss = getBoss();
  if (!startPromise) {
    startPromise = boss.start();
  }
  await startPromise;
  return boss;
}

export const pgboss = {
  async send(name, data, options) {
    const boss = await ensureBossStarted();
    return boss.send(name, data, options);
  }
};
