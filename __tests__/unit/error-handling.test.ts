import { AppError, ErrorType, ErrorCode, createError } from "@/lib/error-handling"

describe("Error Handling", () => {
  describe("AppError", () => {
    it("should create an AppError with the correct properties", () => {
      const error = new AppError("Resource not found", ErrorType.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND, { id: "123" })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
      expect(error.message).toBe("Resource not found")
      expect(error.type).toBe(ErrorType.NOT_FOUND)
      expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND)
      expect(error.status).toBe(404)
      expect(error.details).toEqual({ id: "123" })
    })

    it("should convert to JSON correctly", () => {
      const error = new AppError("Invalid input", ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, { field: "email" })

      const json = error.toJSON()

      expect(json).toHaveProperty("name", "AppError")
      expect(json).toHaveProperty("message", "Invalid input")
      expect(json).toHaveProperty("type", ErrorType.VALIDATION)
      expect(json).toHaveProperty("code", ErrorCode.INVALID_INPUT)
      expect(json).toHaveProperty("status", 400)
      expect(json).toHaveProperty("details", { field: "email" })
      expect(json).toHaveProperty("stack")
    })
  })

  describe("createError", () => {
    it("should create validation errors", () => {
      const error = createError.validation("Invalid email format", { field: "email" })

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.code).toBe(ErrorCode.INVALID_INPUT)
      expect(error.status).toBe(400)
    })

    it("should create authentication errors", () => {
      const error = createError.authentication("Invalid credentials")

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.AUTHENTICATION)
      expect(error.code).toBe(ErrorCode.UNAUTHENTICATED)
      expect(error.status).toBe(401)
    })

    it("should create not found errors", () => {
      const error = createError.notFound("User not found")

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.NOT_FOUND)
      expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND)
      expect(error.status).toBe(404)
    })
  })
})
