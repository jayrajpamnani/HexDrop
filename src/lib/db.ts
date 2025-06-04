import { PrismaClient, Prisma } from "@/generated/prisma";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  errorFormat: "pretty",
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

// Error handling
prisma.$on("query" as never, (e: Prisma.QueryEvent) => {
  if (process.env.NODE_ENV === "development") {
    console.log("Query:", e.query);
    console.log("Params:", e.params);
    console.log("Duration:", `${e.duration}ms`);
  }
});

prisma.$on("error" as never, (e: Prisma.LogEvent) => {
  console.error("Prisma Error:", e);
}); 