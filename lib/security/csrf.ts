"use client"

import { useEffect } from "react"

import { useState } from "react"

import { randomBytes } from "crypto"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const CSRF_COOKIE_NAME = "csrf_token"
const CSRF_HEADER_NAME = "X-CSRF-Token"
const CSRF_FORM_FIELD = "_csrf"
const TOKEN_LENGTH = 32
const TOKEN_TTL = 24 * 60 * 60 * 1000 // 24 hours

export function generateCsrfToken(): string {
  return randomBytes(TOKEN_LENGTH).toString("hex")
}

export function setCsrfCookie(): string {
  const token = generateCsrfToken()
  const cookieStore = cookies()

  cookieStore.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL / 1000, // Convert to seconds
  })

  return token
}

export function getCsrfToken(): string | null {
  const cookieStore = cookies()
  const token = cookieStore.get(CSRF_COOKIE_NAME)
  return token?.value || null
}

export function validateCsrfToken(token: string): boolean {
  const storedToken = getCsrfToken()
  if (!storedToken) return false
  return token === storedToken
}

export function createCsrfMiddleware() {
  return async (req: NextRequest) => {
    // Skip for GET, HEAD, OPTIONS requests as they should be idempotent
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return null
    }

    // Check for CSRF token in headers
    const headerToken = req.headers.get(CSRF_HEADER_NAME)

    // If header token exists, validate it
    if (headerToken) {
      if (!validateCsrfToken(headerToken)) {
        return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
      }
      return null
    }

    // If no header token, check for form field token
    try {
      const formData = await req.formData()
      const formToken = formData.get(CSRF_FORM_FIELD)

      if (!formToken || !validateCsrfToken(formToken.toString())) {
        return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
      }

      // Reconstruct the request with the form data (minus the CSRF token)
      const newFormData = new FormData()
      for (const [key, value] of formData.entries()) {
        if (key !== CSRF_FORM_FIELD) {
          newFormData.append(key, value)
        }
      }

      // Create a new request with the modified form data
      const newRequest = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: newFormData,
      })

      // Store the original request on the new request for later use
      ;(newRequest as any).originalRequest = req

      return newRequest
    } catch (error) {
      // If we can't parse form data, check for JSON body
      try {
        const body = await req.json()

        if (!body[CSRF_FORM_FIELD] || !validateCsrfToken(body[CSRF_FORM_FIELD])) {
          return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
        }

        // Create a new request with the modified body
        const { [CSRF_FORM_FIELD]: _, ...newBody } = body
        const newRequest = new NextRequest(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(newBody),
        })

        // Store the original request on the new request for later use
        ;(newRequest as any).originalRequest = req

        return newRequest
      } catch {
        // If we can't parse JSON either, reject the request
        return NextResponse.json({ error: "Missing CSRF token" }, { status: 403 })
      }
    }
  }
}

// React hook for client components
export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Fetch CSRF token from the server
    fetch("/api/csrf")
      .then((res) => res.json())
      .then((data) => setToken(data.token))
      .catch((err) => console.error("Failed to fetch CSRF token:", err))
  }, [])

  return token
}

// Helper to add CSRF token to fetch requests
export function fetchWithCsrf(url: string, options: RequestInit = {}) {
  const token = getCsrfToken()

  if (!token) {
    throw new Error("CSRF token not available")
  }

  const headers = new Headers(options.headers || {})
  headers.set(CSRF_HEADER_NAME, token)

  return fetch(url, {
    ...options,
    headers,
  })
}
