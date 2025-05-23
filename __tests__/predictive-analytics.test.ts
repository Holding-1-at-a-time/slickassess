import { describe, it, expect, jest, beforeEach } from "@jest/globals"
import {
  forecastLinear,
  forecastAppointments,
  forecastRevenue,
  predictCustomerChurn,
} from "../lib/analytics/predictive-analytics"

// Mock BigQuery client
jest.mock("../lib/analytics/bigquery", () => ({
  getBigQueryClient: jest.fn(() => ({
    query: jest.fn(),
  })),
}))

describe("Predictive Analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("forecastLinear", () => {
    it("should forecast future values correctly", () => {
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: 3, y: 30 },
        { x: 4, y: 40 },
      ]

      const forecast = forecastLinear(data, 2)

      expect(forecast).toHaveLength(6) // 4 original + 2 forecasted
      expect(forecast.slice(0, 4).every((point) => !point.isForecasted)).toBe(true)
      expect(forecast.slice(4).every((point) => point.isForecasted)).toBe(true)

      // Check that forecast follows linear trend
      const forecastedPoints = forecast.slice(4)
      expect(forecastedPoints[0].y).toBeCloseTo(50, 0)
      expect(forecastedPoints[1].y).toBeCloseTo(60, 0)
    })

    it("should handle insufficient data gracefully", () => {
      const data = [{ x: 1, y: 10 }]
      const forecast = forecastLinear(data, 2)

      expect(forecast).toHaveLength(1)
      expect(forecast[0].isForecasted).toBe(false)
    })

    it("should not forecast negative values", () => {
      const data = [
        { x: 1, y: 100 },
        { x: 2, y: 50 },
        { x: 3, y: 0 },
      ]

      const forecast = forecastLinear(data, 3)
      const forecastedPoints = forecast.filter((point) => point.isForecasted)

      forecastedPoints.forEach((point) => {
        expect(point.y).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe("forecastAppointments", () => {
    const mockBigQueryClient = require("../lib/analytics/bigquery").getBigQueryClient

    it("should forecast appointments successfully", async () => {
      const mockRows = [
        { date: { value: "2024-01-01" }, count: 10 },
        { date: { value: "2024-01-02" }, count: 12 },
        { date: { value: "2024-01-03" }, count: 15 },
        { date: { value: "2024-01-04" }, count: 18 },
        { date: { value: "2024-01-05" }, count: 20 },
        { date: { value: "2024-01-06" }, count: 22 },
        { date: { value: "2024-01-07" }, count: 25 },
      ]

      mockBigQueryClient().query.mockResolvedValue([mockRows])

      const result = await forecastAppointments("org123", 30, 7)

      expect(result.historicalData).toHaveLength(7)
      expect(result.forecastData).toHaveLength(7)
      expect(result.trend).toMatch(/increasing|decreasing|stable/)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it("should handle insufficient historical data", async () => {
      const mockRows = [
        { date: { value: "2024-01-01" }, count: 10 },
        { date: { value: "2024-01-02" }, count: 12 },
      ]

      mockBigQueryClient().query.mockResolvedValue([mockRows])

      await expect(forecastAppointments("org123", 30, 7)).rejects.toThrow("Insufficient data for prediction")
    })

    it("should validate input parameters", async () => {
      await expect(forecastAppointments("org123", 5, 7)).rejects.toThrow("Insufficient data for prediction")

      await expect(forecastAppointments("org123", 30, 100)).rejects.toThrow("Invalid date range")
    })

    it("should handle BigQuery errors gracefully", async () => {
      mockBigQueryClient().query.mockRejectedValue(new Error("BigQuery connection failed"))

      await expect(forecastAppointments("org123", 30, 7)).rejects.toThrow("Failed to connect to BigQuery")
    })
  })

  describe("forecastRevenue", () => {
    const mockBigQueryClient = require("../lib/analytics/bigquery").getBigQueryClient

    it("should forecast revenue successfully", async () => {
      const mockRows = [
        { month: "2024-01", revenue: 10000 },
        { month: "2024-02", revenue: 12000 },
        { month: "2024-03", revenue: 15000 },
        { month: "2024-04", revenue: 18000 },
      ]

      mockBigQueryClient().query.mockResolvedValue([mockRows])

      const result = await forecastRevenue("org123", 12, 3)

      expect(result.historicalData).toHaveLength(4)
      expect(result.forecastData).toHaveLength(3)
      expect(result.trend).toMatch(/increasing|decreasing|stable/)
      expect(result.confidence).toBeGreaterThanOrEqual(0)

      // Check month format
      result.forecastData.forEach((item) => {
        expect(item.month).toMatch(/^\d{4}-\d{2}$/)
        expect(item.revenue).toBeGreaterThanOrEqual(0)
        expect(item.confidence).toBeGreaterThan(0)
      })
    })

    it("should handle year rollover correctly", async () => {
      const mockRows = [
        { month: "2023-11", revenue: 10000 },
        { month: "2023-12", revenue: 12000 },
      ]

      mockBigQueryClient().query.mockResolvedValue([mockRows])

      const result = await forecastRevenue("org123", 12, 3)

      const forecastMonths = result.forecastData.map((item) => item.month)
      expect(forecastMonths).toContain("2024-01")
      expect(forecastMonths).toContain("2024-02")
      expect(forecastMonths).toContain("2024-03")
    })
  })

  describe("predictCustomerChurn", () => {
    const mockBigQueryClient = require("../lib/analytics/bigquery").getBigQueryClient

    it("should predict customer churn successfully", async () => {
      const mockRows = [
        {
          recent_activity_days: 5,
          quarterly_activity_days: 15,
          last_activity: { value: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
          avg_transaction: 150,
          total_transactions: 10,
        },
      ]

      mockBigQueryClient().query.mockResolvedValue([mockRows])

      const result = await predictCustomerChurn("org123", "client456")

      expect(result.churnProbability).toBeGreaterThanOrEqual(0)
      expect(result.churnProbability).toBeLessThanOrEqual(1)
      expect(result.riskLevel).toMatch(/low|medium|high/)
      expect(Array.isArray(result.factors)).toBe(true)

      result.factors.forEach((factor) => {
        expect(factor).toHaveProperty("factor")
        expect(factor).toHaveProperty("impact")
        expect(factor.impact).toBeGreaterThan(0)
      })
    })

    it("should identify high-risk customers correctly", async () => {
      const mockRows = [
        {
          recent_activity_days: 0,
          quarterly_activity_days: 2,
          last_activity: { value: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000) },
          avg_transaction: 25,
          total_transactions: 1,
        },
      ]

      mockBigQueryClient().query.mockResolvedValue([mockRows])

      const result = await predictCustomerChurn("org123", "client456")

      expect(result.churnProbability).toBeGreaterThan(0.5)
      expect(result.riskLevel).toBe("high")
      expect(result.factors.length).toBeGreaterThan(2)
    })

    it("should handle missing parameters", async () => {
      await expect(predictCustomerChurn("", "client456")).rejects.toThrow("Missing required parameters")

      await expect(predictCustomerChurn("org123", "")).rejects.toThrow("Missing required parameters")
    })

    it("should handle insufficient data", async () => {
      mockBigQueryClient().query.mockResolvedValue([[]])

      await expect(predictCustomerChurn("org123", "client456")).rejects.toThrow("Insufficient data for prediction")
    })
  })
})
