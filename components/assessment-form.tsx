"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { handleError } from "@/lib/error-handling"
import { Loader2, Save, X, Calendar } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import type { Id } from "@/convex/_generated/dataModel"

const formSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().default("pending"),
  assignedTo: z.string().optional(),
  dueDate: z.date().optional(),
})

type AssessmentFormProps = {
  assessment?: {
    _id: Id<"assessments">
    vehicleId: Id<"vehicles">
    title: string
    description?: string
    status: string
    assignedTo?: string
    dueDate?: number
    findings?: Array<any>
    recommendations?: Array<string>
  }
}

export function AssessmentForm({ assessment }: AssessmentFormProps) {
  const { getToken } = useAuth()
  const { organization } = useOrganization()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createAssessmentMutation = useMutation(api.assessments.createAssessment)
  const updateAssessmentMutation = useMutation(api.assessments.updateAssessment)

  // Get the vehicle ID from the URL if it exists
  const vehicleIdFromUrl = searchParams.get("vehicleId")

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

  // Fetch vehicles for the dropdown
  const vehicles = useQuery(
    api.vehicles.getVehicles,
    {},
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  // Initialize form with assessment data or defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: assessment?.vehicleId || (vehicleIdFromUrl as string) || "",
      title: assessment?.title || "",
      description: assessment?.description || "",
      status: assessment?.status || "pending",
      assignedTo: assessment?.assignedTo || "",
      dueDate: assessment?.dueDate ? new Date(assessment.dueDate) : undefined,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    try {
      const token = await getToken({ template: "convex" })
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined

      // Convert date to timestamp
      const dueDate = values.dueDate ? values.dueDate.getTime() : undefined

      if (assessment) {
        // Update existing assessment
        await updateAssessmentMutation(
          {
            assessmentId: assessment._id,
            title: values.title,
            description: values.description,
            status: values.status,
            assignedTo: values.assignedTo,
            dueDate,
          },
          { additionalHeaders: headers },
        )

        toast({
          title: "Success",
          description: "Assessment updated successfully",
        })
      } else {
        // Create new assessment
        const assessmentId = await createAssessmentMutation(
          {
            vehicleId: values.vehicleId as Id<"vehicles">,
            title: values.title,
            description: values.description,
            status: values.status,
            assignedTo: values.assignedTo,
            dueDate,
          },
          { additionalHeaders: headers },
        )

        toast({
          title: "Success",
          description: "Assessment created successfully",
        })

        // Redirect to the new assessment page
        router.push(`/assessments/${assessmentId}`)
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
        <CardTitle className="text-[#00ae98] neon-text">{assessment ? "Edit Assessment" : "New Assessment"}</CardTitle>
        <CardDescription className="text-secondary">
          {assessment ? "Update assessment information" : "Create a new assessment for a vehicle"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00ae98]">
                    Vehicle <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!!assessment} // Disable if editing
                  >
                    <FormControl>
                      <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
                        <SelectValue placeholder="Select a vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles?.map((vehicle) => (
                        <SelectItem key={vehicle._id} value={vehicle._id}>
                          {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00ae98]">
                    Title <span className="text-red-500">*</span>
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00ae98]">Description</FormLabel>
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

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Assigned To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {organization?.memberships?.map((member) => (
                          <SelectItem key={member.publicUserData.userId} value={member.publicUserData.userId}>
                            {member.publicUserData.firstName} {member.publicUserData.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-[#00ae98]">Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal border-secondary hover:bg-[#00ae98]/10 ${
                              !field.value && "text-muted-foreground"
                            }`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    {assessment ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {assessment ? "Update Assessment" : "Create Assessment"}
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
