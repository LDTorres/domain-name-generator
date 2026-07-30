import { NextResponse } from "next/server";
import { domainProviderStatuses } from "@/lib/domain-providers";
import { prisma } from "@/server/db";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "healthy",
      database: "ready",
      domainProviders: domainProviderStatuses(),
      aiOptimizer: {
        id: "openrouter",
        configured: Boolean(process.env.OPENROUTER_API_KEY)
      },
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error("health.database_failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "unavailable",
        checkedAt: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
