import { withErrorBoundary } from "@/components/with-error-boundary"

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to the dashboard!</p>
    </div>
  )
}

const DashboardWithErrorBoundary = withErrorBoundary(Dashboard)

export default function DashboardPage() {
  return <DashboardWithErrorBoundary />
}
