"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CassetteLoader } from "@/components/cassette-loader"
import { handleError } from "@/lib/error-handling"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Car, Building, MoreHorizontal, Edit, Trash2, FileText } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

export function VehicleList() {
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const search = searchParams.get("search") || ""
  const make = searchParams.get("make") || undefined
  const status = searchParams.get("status") || undefined
  const sortBy = searchParams.get("sortBy") || "recent"

  // Fetch the token
  useEffect(() => {
    async function fetchToken() {
      try {
        const newToken = await getToken({ template: "convex" })
        setToken(newToken)
      } catch (error) {
        handleError(error)
      }
    }

    fetchToken()
  }, [getToken])

  // Fetch vehicles using the token
  const vehicles = useQuery(
    api.vehicles.getVehicles,
    {
      search,
      make,
      status,
      sortBy,
    },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  if (vehicles === undefined) {
    return <CassetteLoader />
  }

  return (
    <Card className="shadow-neon mt-6">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-secondary">
                    No vehicles found. Add your first vehicle to get started.
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle) => (
                  <TableRow key={vehicle._id} className="hover:bg-[#00ae98]/5">
                    <TableCell className="font-medium">
                      <Link href={`/vehicles/${vehicle._id}`} className="hover:text-[#00ae98] transition-colors">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-[#00ae98]" />
                          {vehicle.make} {vehicle.model}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/clients/${vehicle.clientId}`} className="hover:text-[#00ae98] transition-colors">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-secondary" />
                          <span>{vehicle.clientName}</span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{vehicle.year}</div>
                        {vehicle.licensePlate && (
                          <div className="text-xs text-secondary">LP: {vehicle.licensePlate}</div>
                        )}
                        {vehicle.vin && <div className="text-xs text-secondary">VIN: {vehicle.vin}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={vehicle.status === "active" ? "default" : "secondary"}
                        className={
                          vehicle.status === "active"
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-secondary hover:bg-secondary/90"
                        }
                      >
                        {vehicle.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#00ae98] hover:text-[#00ae98]/90 hover:bg-[#00ae98]/10"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/vehicles/${vehicle._id}`)}
                          >
                            <Car className="mr-2 h-4 w-4" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/vehicles/${vehicle._id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit Vehicle</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/assessments/new?vehicleId=${vehicle._id}`)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            <span>New Assessment</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete Vehicle</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
