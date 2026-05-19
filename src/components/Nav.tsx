"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const links = [
  { href: "/dashboard", label: "Games" },
  { href: "/friends", label: "Friends" },
]

export default function Nav({ username }: { username: string }) {
  const pathname = usePathname()

  return (
    <header className="bg-green-800 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/dashboard" className="font-bold text-amber-300 tracking-widest text-lg">
          SCRABBLE
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? "bg-green-700 text-white"
                  : "text-green-100 hover:bg-green-700"
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="ml-2 flex items-center gap-2">
            <span className="text-green-300 text-sm hidden sm:inline">{username}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-green-200 hover:text-white text-sm px-2 py-1"
            >
              Sign out
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
