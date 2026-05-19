import { prisma } from "./prisma.js";

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection error:", (error as Error).message);
    throw error;
  }
}
