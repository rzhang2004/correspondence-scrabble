import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Nav from "@/components/Nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen flex flex-col">
      <Nav username={session.user.username} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
