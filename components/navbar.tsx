"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BarChart, Calendar, Car, ClipboardList, CreditCard, Home, Settings, Users, Inbox } from "lucide-react"

interface NavbarProps {
  className?: string
}

export function Navbar({ className }: NavbarProps) {
  const pathname = usePathname()

  const routes = [
    {
      href: "/dashboard",
      icon: Home,
      label: "Dashboard",
      active: pathname === "/dashboard",
    },
    {
      href: "/assessments",
      icon: ClipboardList,
      label: "Assessments",
      active: pathname === "/assessments" || pathname?.startsWith("/assessments/"),
    },
    {
      href: "/leads",
      icon: Inbox,
      label: "Leads",
      active: pathname === "/leads" || pathname?.startsWith("/leads/"),
    },
    {
      href: "/vehicles",
      icon: Car,
      label: "Vehicles",
      active: pathname === "/vehicles" || pathname?.startsWith("/vehicles/"),
    },
    {
      href: "/clients",
      icon: Users,
      label: "Clients",
      active: pathname === "/clients" || pathname?.startsWith("/clients/"),
    },
    {
      href: "/calendar",
      icon: Calendar,
      label: "Calendar",
      active: pathname === "/calendar" || pathname?.startsWith("/calendar/"),
    },
    {
      href: "/insights",
      icon: BarChart,
      label: "Insights",
      active: pathname === "/insights",
    },
    {
      href: "/settings/billing",
      icon: CreditCard,
      label: "Billing",
      active: pathname === "/settings/billing",
    },
    {
      href: "/organization",
      icon: Settings,
      label: "Organization",
      active: pathname === "/organization" || pathname?.startsWith("/organization/"),
    },
  ]

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)}>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            route.active ? "text-black dark:text-white" : "text-muted-foreground",
          )}
        >
          <div className="flex flex-col items-center gap-1">
            <route.icon className="h-5 w-5" />
            <span>{route.label}</span>
          </div>
        </Link>
      ))}
    </nav>
  )
}
