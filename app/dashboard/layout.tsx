import type React from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import { AuthErrorHandler } from "@/components/auth-error-handler"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthErrorHandler>
      <div className="flex h-screen overflow-hidden">
        <ErrorBoundary>
          <Sidebar />
        </ErrorBoundary>
        <div className="flex flex-col flex-1 overflow-hidden">
          <ErrorBoundary>
            <Navbar />
          </ErrorBoundary>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </AuthErrorHandler>
  )
}
