import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSummarySkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="shadow-neon">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Skeleton className="h-5 w-5 mr-2 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-4 w-24 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <div className="mt-4">
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
