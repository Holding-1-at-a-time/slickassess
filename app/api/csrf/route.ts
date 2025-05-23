import { type NextRequest, NextResponse } from "next/server"
import { getCsrfToken } from "@/lib/security/csrf"
import { logger } from "@/lib/logging/logger"

export async function GET(req: NextRequest) {
  try {
    const token = await getCsrfToken()

    return NextResponse.json({ csrfToken: token })
  } catch (error) {
    logger.error({ error }, "Error in CSRF token generation")
    return NextResponse.json({ error: "Failed to generate CSRF token" }, { status: 500 })
  }
}
