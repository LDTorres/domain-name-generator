import { NextResponse } from "next/server";
import { configuredDomainProvider } from "@/lib/domain-providers";
import { prisma } from "@/server/db";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = configuredDomainProvider();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "healthy",
      database: "ready",
      domainProvider: {
        id: provider.id,
        configured: provider.configured
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
