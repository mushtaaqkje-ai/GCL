import { PrismaClient, Prisma } from "@prisma/client";
export { Prisma };
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;

// Re-use pg.Pool in development to prevent leaking connections on HMR reloads
const pool = globalForPrisma.pool ?? new pg.Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
