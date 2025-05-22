"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { handleError } from "@/lib/error-handling"
import { Loader2, Save, X } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default("active"),
})

type ClientFormProps = {
  client?: {
    _id: Id<"clients">
    name: string
    email?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    notes?: string
    status: string
  }
}

export function ClientForm({ client }: ClientFormProps) {
  const { getToken } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createClientMutation = useMutation(api.clients.createClient)
  const updateClientMutation = useMutation(api.clients.updateClient)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
      city: client?.city || "",
      state: client?.state || "",
      zipCode: client?.zipCode || "",
      notes: client?.notes || "",
      status: client?.status || "active",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    try {
      const token = await getToken({ template: "convex" })
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined

      if (client) {
        // Update existing client
        await updateClientMutation(
          {
            clientId: client._id,
            ...values,
          },
          { additionalHeaders: headers },
        )

        toast({
          title: "Success",
          description: "Client updated successfully",
        })
      } else {
        // Create new client
        const clientId = await createClientMutation(values, { additionalHeaders: headers })

        toast({
          title: "Success",
          description: "Client created successfully",
        })

        // Redirect to the new client page
        router.push(`/clients/${clientId}`)
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
        <CardTitle className="text-[#00ae98] neon-text">{client ? "Edit Client" : "Add New Client"}</CardTitle>
        <CardDescription className="text-secondary">
          {client ? "Update client information" : "Enter client details to create a new client"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00ae98]">
                    Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#00ae98]">City</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#00ae98]">State</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#00ae98]">Zip Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00ae98]">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[100px] border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {client && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-secondary text-secondary hover:bg-secondary hover:text-white"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {client ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {client ? "Update Client" : "Create Client"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
