"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CassetteLoader } from "@/components/cassette-loader"
import { toast } from "@/components/ui/use-toast"

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

export function OrganizationMemberList() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const { getToken } = useAuth()
  const router = useRouter()

  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true)
        const token = await getToken({ template: "convex" })
        const res = await fetch("/api/org/members", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (res.ok) {
          const data = await res.json()
          setMembers(data.members)
        } else if (res.status === 401) {
          router.push("/sign-in")
        } else {
          const data = await res.json()
          toast({
            title: "Error",
            description: data.error || "Failed to fetch members",
            variant: "destructive",
          })
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch organization members",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [getToken, router])

  if (loading) {
    return <CassetteLoader />
  }

  return (
    <Card className="shadow-neon">
      <CardHeader>
        <CardTitle className="text-[#00ae98] neon-text">Organization Members</CardTitle>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} className="hover:bg-[#00ae98]/5">
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
                        variant={member.role.includes("admin") ? "default" : "outline"}
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
