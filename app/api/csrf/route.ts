import { type NextRequest, NextResponse } from "next/server"
import { setCsrfCookie } from "@/lib/security/csrf"

export async function GET(req: NextRequest) {
  const token = setCsrfCookie()

  return NextResponse.json({ token })
}
