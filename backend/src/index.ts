import dotenv from "dotenv";
dotenv.config();

import { httpServer } from "./app.js";
import { setupSocket } from "./socket/index.js";
import { connectDB } from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import { env } from "./config/env.js";
import { startBackgroundJobs } from "./events/index.js";
import { adminService } from "./services/admin.service.js";
import { pushService } from "./services/push.service.js";

async function seedAdminDefaults() {
  try {
    await adminService.seedDefaultFeatures();
    await adminService.seedDefaultSettings();
    await adminService.seedAdminUser();
  } catch {
    // silently fail - tables might not exist yet
  }
}

async function start() {
  env.load();

  try {
    await connectDB();
  } catch (err) {
    console.error("Database connection failed:", (err as Error).message);
    process.exit(1);
  }

  try {
    await connectRedis();
  } catch {
    console.warn("Redis not available, running without it");
  }

  await seedAdminDefaults();
  await pushService.init();
  await setupSocket(httpServer);

  startBackgroundJobs();

  httpServer.listen(env.PORT, () => {
    console.log(`Server running on port:${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });
}

start();
