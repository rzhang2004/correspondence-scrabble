import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  // Railway's internal network (*.railway.internal) doesn't support SSL.
  // External/public URLs do. Let pg figure it out automatically by only
  // disabling SSL when we're on the internal hostname.
  const isInternal = connectionString.includes(".railway.internal")
  const pool = new Pool({
    connectionString,
    ssl: isInternal ? false : { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createPrismaClient> }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
