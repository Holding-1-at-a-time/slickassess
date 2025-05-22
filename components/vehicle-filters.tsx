"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Search, X } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { handleError } from "@/lib/error-handling"

export function VehicleFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [make, setMake] = useState(searchParams.get("make") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "recent")

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

  // Get unique makes for the dropdown
  const vehicles = useQuery(
    api.vehicles.getVehicles,
    {},
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  // Extract unique makes
  const uniqueMakes = vehicles ? Array.from(new Set(vehicles.map((vehicle) => vehicle.make))).sort() : []

  // Apply filters when they change
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (make) params.set("make", make)
    if (status) params.set("status", status)
    if (sortBy) params.set("sortBy", sortBy)

    router.push(`/vehicles?${params.toString()}`)
  }, [make, status, sortBy, router])

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) {
      params.set("search", search)
    } else {
      params.delete("search")
    }
    router.push(`/vehicles?${params.toString()}`)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearch("")
    setMake("")
    setStatus("")
    setSortBy("recent")
    router.push("/vehicles")
  }

  return (
    <Card className="shadow-neon">
      <CardContent className="p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 md:col-span-2">
            <Input
              placeholder="Search vehicles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
            />
            <Button type="submit" variant="outline" className="border-[#00ae98] text-[#00ae98] hover:bg-[#00ae98]/10">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <Select value={make} onValueChange={setMake}>
            <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
              <SelectValue placeholder="Make" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Makes</SelectItem>
              {uniqueMakes.map((make) => (
                <SelectItem key={make} value={make}>
                  {make}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy} className="md:col-span-2">
            <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="year_desc">Year (Newest First)</SelectItem>
              <SelectItem value="year_asc">Year (Oldest First)</SelectItem>
              <SelectItem value="make_asc">Make (A-Z)</SelectItem>
              <SelectItem value="make_desc">Make (Z-A)</SelectItem>
            </SelectContent>
          </Select>

          {(search || make || status || sortBy !== "recent") && (
            <div className="md:col-span-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-secondary hover:text-[#00ae98]">
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
