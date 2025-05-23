/**
    * @description      : 
    * @author           : rrome
    * @group            : 
    * @created          : 22/05/2025 - 22:19:27
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/05/2025
    * - Author          : rrome
    * - Modification    : 
**/
"use node"

import { action } from "../_generated/server"
import { v } from "convex/values"
import QRCode from "qrcode"

// Action to generate QR code without blocking the mutation handler
export const generateQrCode = action({
  args: {
    url: v.string(),
    options: v.optional(
      v.object({
        width: v.optional(v.number()),
        margin: v.optional(v.number()),
        color: v.optional(
          v.object({
            dark: v.optional(v.string()),
            light: v.optional(v.string()),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const options = args.options || {
      width: 512,
      margin: 1,
      color: {
        dark: "#00AE98",
        light: "#FFFFFF",
      },
    }

    try {
      // Generate QR code as data URL
      return await QRCode.toDataURL(args.url, options);
    } catch (error) {
      console.error("Error generating QR code:", error)
      throw new Error("Failed to generate QR code")
    }
  },
})
