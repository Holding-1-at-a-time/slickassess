"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CassetteLoader } from "@/components/cassette-loader"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, UserX, UserCog, Mail, AlertTriangle } from "lucide-react"
import { handleError } from "@/lib/error-handling"

type Member = {
  id: string
  userId?: string
  email: string
  firstName?: string
  lastName?: string
  imageUrl?: string
  role: string
  status: string
  createdAt: string
}

export function OrganizationMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true)
        const response = await fetch("/api/org/members")
        const data = await response.json()

        if (response.ok) {
          setMembers(data.members)
        } else {
          handleError(new Error(data.error || "Failed to fetch members"))
        }
      } catch (error) {
        handleError(error)
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [])

  const getRoleBadgeVariant = (role: string) => {
    if (role.includes("admin")) return "default"
    if (role === "staff") return "outline"
    if (role === "assessor") return "secondary"
    return "outline"
  }

  if (loading) {
    return <CassetteLoader />
  }

  return (
    <Card className="shadow-neon">
      <CardHeader>
        <CardTitle className="text-[#00ae98] neon-text">Organization Members</CardTitle>
        <CardDescription className="text-secondary">
          Manage your organization's members and pending invitations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-6 text-secondary">No members found in this organization</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 border border-[#00ae98]">
                          <AvatarImage src={member.imageUrl || "/placeholder.svg"} />
                          <AvatarFallback className="bg-[#00ae98]/20 text-[#00ae98]">
                            {member.firstName?.[0] || member.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.firstName && member.lastName
                              ? `${member.firstName} ${member.lastName}`
                              : member.email}
                          </div>
                          {member.firstName && <div className="text-xs text-secondary">{member.email}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getRoleBadgeVariant(member.role)}
                        className={
                          member.role.includes("admin")
                            ? "bg-[#00ae98] hover:bg-[#00ae98]/90"
                            : "border-[#00ae98] text-[#00ae98]"
                        }
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.status === "active" ? "default" : "secondary"}
                        className={
                          member.status === "active"
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-amber-500 hover:bg-amber-600"
                        }
                      >
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(member.createdAt).toLocaleDateString()}</TableCell>
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
                          <DropdownMenuItem className="cursor-pointer">
                            <UserCog className="mr-2 h-4 w-4" />
                            <span>Change Role</span>
                          </DropdownMenuItem>
                          {member.status === "pending" && (
                            <DropdownMenuItem className="cursor-pointer">
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Resend Invitation</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer text-red-600">
                            {member.status === "pending" ? (
                              <>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                <span>Cancel Invitation</span>
                              </>
                            ) : (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                <span>Remove Member</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
