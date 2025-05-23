// Define specific error types for predictive analytics
export class PredictiveAnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>,
  ) {
    super(message)
    this.name = "PredictiveAnalyticsError"
  }
}

export class DataInsufficientError extends PredictiveAnalyticsError {
  constructor(requiredDataPoints: number, actualDataPoints: number) {
    super(
      `Insufficient data for prediction. Required: ${requiredDataPoints}, Actual: ${actualDataPoints}`,
      "DATA_INSUFFICIENT",
      { requiredDataPoints, actualDataPoints },
    )
  }
}

export class BigQueryConnectionError extends PredictiveAnalyticsError {
  constructor(originalError: Error) {
    super("Failed to connect to BigQuery service", "BIGQUERY_CONNECTION_ERROR", {
      originalError: originalError.message,
    })
  }
}

export class ModelAccuracyError extends PredictiveAnalyticsError {
  constructor(accuracy: number, threshold: number) {
    super(`Model accuracy ${accuracy} below threshold ${threshold}`, "MODEL_ACCURACY_LOW", { accuracy, threshold })
  }
}

export class InvalidDateRangeError extends PredictiveAnalyticsError {
  constructor(startDate: number, endDate: number) {
    super("Invalid date range provided", "INVALID_DATE_RANGE", { startDate, endDate })
  }
}
