import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function RecentActivitySkeleton() {
  return (
    <Card className="shadow-neon">
      <CardContent className="p-6">
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-1 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32 mt-1" />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
