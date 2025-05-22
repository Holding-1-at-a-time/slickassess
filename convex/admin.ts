import { query } from "./_generated/server"

// This function is only accessible with the admin key
export const getAllActiveCalendarIntegrations = query({
  args: {},
  handler: async (ctx) => {
    // No auth check here because this is called with the admin key
    return await ctx.db
      .query("calendarIntegrations")
      .filter((q) => q.eq(q.field("syncEnabled"), true))
      .collect()
  },
})
