"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useOrganization } from "@clerk/nextjs"
import { withAuth } from "@/components/with-auth"
import { useToast } from "@/components/ui/use-toast"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, CheckCircle, CreditCard, FileText, RefreshCw } from "lucide-react"

// Define pricing plans
const PRICING_PLANS = [
  {
    id: "price_basic",
    name: "Basic",
    price: 49,
    interval: "month",
    features: [
      "Up to 50 assessments per month",
      "Basic damage detection",
      "Email notifications",
      "30-day data retention",
    ],
  },
  {
    id: "price_pro",
    name: "Professional",
    price: 99,
    interval: "month",
    features: [
      "Up to 200 assessments per month",
      "Advanced damage detection",
      "Email & SMS notifications",
      "90-day data retention",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "price_enterprise",
    name: "Enterprise",
    price: 199,
    interval: "month",
    features: [
      "Unlimited assessments",
      "Premium damage detection",
      "All notification channels",
      "1-year data retention",
      "24/7 priority support",
      "Custom integrations",
    ],
  },
]

function BillingPage() {
  const { getToken } = useAuth()
  const { organization } = useOrganization()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  // Get subscription status from Convex
  const orgId = organization?.id || ""
  const subscriptionStatus = useQuery(api.billing.getSubscriptionStatus, { orgId })
  const invoices = useQuery(api.billing.getInvoices, { orgId })

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100)
  }

  // Handle subscription checkout
  const handleSubscribe = async (priceId: string) => {
    try {
      setIsLoading(true)
      setSelectedPlan(priceId)

      // Get JWT token for authentication
      const token = await getToken({ template: "convex" })

      // Create checkout session
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const { sessionId } = await response.json()

      // Redirect to Stripe Checkout
      const stripe = (window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      await stripe.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setSelectedPlan(null)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing information</p>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>Your current subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptionStatus === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          ) : subscriptionStatus?.status === "none" ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">You don't have an active subscription</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Status</p>
                  <div className="flex items-center space-x-2">
                    {subscriptionStatus.isActive ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 text-yellow-500" />
                        <span>{subscriptionStatus.status}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Plan</p>
                  <p>{subscriptionStatus.planId || "Unknown"}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Renewal Date</p>
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(subscriptionStatus.currentPeriodEnd)}</span>
                  </div>
                </div>
              </div>
              {subscriptionStatus.cancelAtPeriodEnd && (
                <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                  <p className="text-amber-800">
                    Your subscription will be canceled at the end of the current billing period.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Pricing Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => (
            <Card key={plan.id} className={plan.popular ? "border-primary" : ""}>
              {plan.popular && (
                <div className="absolute top-0 right-0 -mt-2 -mr-2">
                  <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/{plan.interval}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isLoading && selectedPlan === plan.id}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {isLoading && selectedPlan === plan.id ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Subscribe
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your recent invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id.toString()}>
                        <td className="px-4 py-3 text-sm">{formatDate(invoice.createdAt)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{formatCurrency(invoice.amount)}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={invoice.status === "paid" ? "success" : "secondary"}>{invoice.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {invoice.invoiceUrl && (
                            <a
                              href={invoice.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:underline"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(BillingPage, ["admin"])
