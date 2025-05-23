export async function getTopClientsByRevenue(invoices: any[]): Promise<{ clientId: string; revenue: number }[]> {
  const revenueByClient = new Map<string, number>()

  // Sum revenue per client (filter out invoices without clientId)
  for (const invoice of invoices) {
    const clientId = invoice.clientId
    if (!clientId) {
      console.warn(`Invoice ${invoice._id} has no clientId, skipping from revenue analytics`)
      continue
    }
    const currentRevenue = revenueByClient.get(clientId) || 0
    revenueByClient.set(clientId, currentRevenue + invoice.amount)
  }

  // Convert map to array of objects for sorting
  const clientRevenueList: { clientId: string; revenue: number }[] = Array.from(revenueByClient.entries()).map(
    ([clientId, revenue]) => ({
      clientId,
      revenue,
    }),
  )

  // Sort by revenue in descending order
  clientRevenueList.sort((a, b) => b.revenue - a.revenue)

  return clientRevenueList
}
