import { NextRequest, NextResponse } from "next/server"
import { createValidationMiddleware } from "@/lib/validations/validation"
import { clientSchema, apiListRequestSchema } from "@/lib/validations/schemas"

const validateClientData = createValidationMiddleware(clientSchema)

export async function POST(req: NextRequest) {
  // Validate the request
  const validationResponse = await validateClientData(req)
  if (validationResponse) {
    return validationResponse
  }

  // The request is now validated, and the data is available on req.validatedData
  const clientData = (req as any).validatedData

  return NextResponse.json({ message: "Client created successfully", data: clientData }, { status: 201 })
}

const validateListRequest = createValidationMiddleware(apiListRequestSchema)

export async function GET(req: NextRequest) {
  // Validate query parameters
  const url = new URL(req.url)
  const page = url.searchParams.get("page") || "1"
  const limit = url.searchParams.get("limit") || "10"
  const sort = url.searchParams.get("sort") || ""
  const direction = url.searchParams.get("direction") || "asc"

  // Create a request-like object with the query parameters
  const validationReq = new NextRequest(req.url, {
    headers: req.headers,
    method: req.method,
    body: JSON.stringify({
      pagination: { page: Number.parseInt(page), limit: Number.parseInt(limit) },
      sort: sort ? { field: sort, direction } : undefined,
    }),
  })

  const validationResponse = await validateListRequest(validationReq)
  if (validationResponse) {
    return validationResponse
  }

  return NextResponse.json({ message: "Clients fetched successfully" }, { status: 200 })
}
