"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Search, X } from "lucide-react"

export function ClientFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "name_asc")

  // Apply filters when they change
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (status) params.set("status", status)
    if (sortBy) params.set("sortBy", sortBy)

    router.push(`/clients?${params.toString()}`)
  }, [status, sortBy, router])

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) {
      params.set("search", search)
    } else {
      params.delete("search")
    }
    router.push(`/clients?${params.toString()}`)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearch("")
    setStatus("")
    setSortBy("name_asc")
    router.push("/clients")
  }

  return (
    <Card className="shadow-neon">
      <CardContent className="p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 md:col-span-2">
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
            />
            <Button type="submit" variant="outline" className="border-[#00ae98] text-[#00ae98] hover:bg-[#00ae98]/10">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
            </SelectContent>
          </Select>

          {(search || status !== "" || sortBy !== "name_asc") && (
            <div className="md:col-span-4 flex justify-end">
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
