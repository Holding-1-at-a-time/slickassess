"use client"

import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { OrganizationSwitcher } from "./organization-switcher"
import { ThemeToggle } from "./theme-toggle"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Building, LayoutDashboard, Settings, Users, Car, FileText } from "lucide-react"

export function Navbar() {
  const pathname = usePathname()

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Vehicles",
      href: "/vehicles",
      icon: Car,
    },
    {
      label: "Assessments",
      href: "/assessments",
      icon: FileText,
    },
    {
      label: "Members",
      href: "/organization/members",
      icon: Users,
    },
    {
      label: "Settings",
      href: "/organization/settings",
      icon: Settings,
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#707070] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Building className="h-6 w-6 text-[#00ae98]" />
            <span className="text-xl font-bold text-[#00ae98] neon-text">SlickAssess</span>
          </Link>

          <nav className="hidden md:flex">
            <ul className="flex items-center gap-6">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-colors hover:text-[#00ae98]",
                      pathname === item.href ? "text-[#00ae98] neon-text" : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <OrganizationSwitcher />
          <ThemeToggle />
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 border-2 border-[#00ae98]",
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}
