import Link from "next/link"
import { UserButton } from "./user-button"
import { ThemeToggle } from "./theme-toggle"
import { OrganizationSwitcher } from "./organization-switcher"
import { auth } from "@clerk/nextjs/server"

export function Header() {
  const { userId } = auth()

  return (
    <header className="border-b border-[#707070]">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-bold text-[#00ae98] neon-text text-xl">
          Next.js + Clerk
        </Link>
        <div className="flex items-center gap-4">
          {userId && <OrganizationSwitcher />}
          <ThemeToggle />
          {userId && <UserButton />}
        </div>
      </div>
    </header>
  )
}
