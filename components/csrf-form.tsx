"use client"

import type React from "react"
import { useCsrfToken } from "@/lib/security/csrf"

interface CsrfFormProps {
  children: React.ReactNode
  action: string
  method?: "post" | "get"
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  className?: string
}

export function CsrfForm({ children, action, method = "post", onSubmit, className }: CsrfFormProps) {
  const csrfToken = useCsrfToken()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (onSubmit) {
      onSubmit(e)
    }
  }

  return (
    <form action={action} method={method} onSubmit={handleSubmit} className={className}>
      {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
      {children}
    </form>
  )
}
