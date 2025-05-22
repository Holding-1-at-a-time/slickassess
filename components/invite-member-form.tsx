"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { inviteMemberAction } from "@/app/actions/invite-member"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Send } from "lucide-react"
import { handleError } from "@/lib/error-handling"

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.string().min(1, "Please select a role"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

export function InviteMemberForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "org:member",
      firstName: "",
      lastName: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("email", values.email)
      formData.append("role", values.role)
      if (values.firstName) formData.append("firstName", values.firstName)
      if (values.lastName) formData.append("lastName", values.lastName)

      const result = await inviteMemberAction(formData)

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        form.reset()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      handleError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="shadow-neon">
      <CardHeader>
        <CardTitle className="text-[#00ae98] neon-text">Invite New Member</CardTitle>
        <CardDescription className="text-secondary">Send an invitation to join your organization</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
                        {...field}
                        value={field.value || ""}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormDescription className="text-secondary">Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        {...field}
                        value={field.value || ""}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormDescription className="text-secondary">Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00ae98]">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="email@example.com"
                      {...field}
                      className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                    />
                  </FormControl>
                  <FormDescription className="text-secondary">
                    Enter the email address of the person you want to invite
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00ae98]">Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="org:admin">Organization Admin</SelectItem>
                      <SelectItem value="org:member">Organization Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="assessor">Assessor</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-secondary">Select the role for this member</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
