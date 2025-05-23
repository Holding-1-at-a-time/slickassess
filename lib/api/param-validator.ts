/**
 * Utility for validating and sanitizing API parameters
 */

type ValidationRule<T> = {
  validate: (value: any) => boolean
  transform?: (value: any) => T
  errorMessage: string
}

export class ParamValidator {
  private errors: string[] = []
  private validParams: Record<string, any> = {}

  /**
   * Validate a string parameter
   */
  validateString(
    name: string,
    value: string | null | undefined,
    options: {
      required?: boolean
      allowedValues?: string[]
      minLength?: number
      maxLength?: number
      pattern?: RegExp
    } = {},
  ): this {
    // Handle required check
    if (options.required && (value === null || value === undefined || value === "")) {
      this.errors.push(`Parameter '${name}' is required`)
      return this
    }

    // Skip further validation if value is not provided and not required
    if (value === null || value === undefined || value === "") {
      return this
    }

    // Validate allowed values
    if (options.allowedValues && !options.allowedValues.includes(value)) {
      this.errors.push(`Parameter '${name}' must be one of: ${options.allowedValues.join(", ")}`)
      return this
    }

    // Validate length
    if (options.minLength !== undefined && value.length < options.minLength) {
      this.errors.push(`Parameter '${name}' must be at least ${options.minLength} characters`)
    }

    if (options.maxLength !== undefined && value.length > options.maxLength) {
      this.errors.push(`Parameter '${name}' must be at most ${options.maxLength} characters`)
    }

    // Validate pattern
    if (options.pattern && !options.pattern.test(value)) {
      this.errors.push(`Parameter '${name}' has invalid format`)
      return this
    }

    // If we got here, the parameter is valid
    this.validParams[name] = value
    return this
  }

  /**
   * Validate a number parameter
   */
  validateNumber(
    name: string,
    value: string | null | undefined,
    options: {
      required?: boolean
      min?: number
      max?: number
      integer?: boolean
    } = {},
  ): this {
    // Handle required check
    if (options.required && (value === null || value === undefined || value === "")) {
      this.errors.push(`Parameter '${name}' is required`)
      return this
    }

    // Skip further validation if value is not provided and not required
    if (value === null || value === undefined || value === "") {
      return this
    }

    // Parse the number
    const num = Number(value)

    // Check if it's a valid number
    if (isNaN(num)) {
      this.errors.push(`Parameter '${name}' must be a valid number`)
      return this
    }

    // Check if it's an integer when required
    if (options.integer && !Number.isInteger(num)) {
      this.errors.push(`Parameter '${name}' must be an integer`)
      return this
    }

    // Validate range
    if (options.min !== undefined && num < options.min) {
      this.errors.push(`Parameter '${name}' must be at least ${options.min}`)
    }

    if (options.max !== undefined && num > options.max) {
      this.errors.push(`Parameter '${name}' must be at most ${options.max}`)
    }

    // If we got here, the parameter is valid
    this.validParams[name] = num
    return this
  }

  /**
   * Validate a date parameter
   */
  validateDate(
    name: string,
    value: string | null | undefined,
    options: {
      required?: boolean
      minDate?: Date
      maxDate?: Date
    } = {},
  ): this {
    // Handle required check
    if (options.required && (value === null || value === undefined || value === "")) {
      this.errors.push(`Parameter '${name}' is required`)
      return this
    }

    // Skip further validation if value is not provided and not required
    if (value === null || value === undefined || value === "") {
      return this
    }

    // Parse the date
    const date = new Date(value)

    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      this.errors.push(`Parameter '${name}' must be a valid date`)
      return this
    }

    // Validate range
    if (options.minDate && date < options.minDate) {
      this.errors.push(`Parameter '${name}' must be after ${options.minDate.toISOString().split("T")[0]}`)
    }

    if (options.maxDate && date > options.maxDate) {
      this.errors.push(`Parameter '${name}' must be before ${options.maxDate.toISOString().split("T")[0]}`)
    }

    // If we got here, the parameter is valid
    this.validParams[name] = date
    return this
  }

  /**
   * Check if validation passed
   */
  isValid(): boolean {
    return this.errors.length === 0
  }

  /**
   * Get validation errors
   */
  getErrors(): string[] {
    return this.errors
  }

  /**
   * Get validated parameters
   */
  getParams(): Record<string, any> {
    return this.validParams
  }

  /**
   * Create a URLSearchParams object from validated parameters
   */
  toURLSearchParams(): URLSearchParams {
    const params = new URLSearchParams()

    for (const [key, value] of Object.entries(this.validParams)) {
      if (value instanceof Date) {
        params.set(key, value.toISOString())
      } else {
        params.set(key, String(value))
      }
    }

    return params
  }
}
