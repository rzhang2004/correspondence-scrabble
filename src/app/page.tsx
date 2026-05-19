import { redirect } from "next/navigation"
import { auth } from "@/auth"
import Link from "next/link"

export default async function Home() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-900 to-green-700 px-4">
      <div className="text-center space-y-6 max-w-lg">
        <div className="text-6xl font-bold tracking-widest text-amber-300 drop-shadow-lg">
          SCRABBLE
        </div>
        <p className="text-green-100 text-lg">
          Play correspondence Scrabble with friends — take your turn whenever you&apos;re ready.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/login"
            className="px-8 py-3 bg-amber-400 text-green-900 font-semibold rounded-lg hover:bg-amber-300 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 bg-green-800 text-white font-semibold rounded-lg border border-green-600 hover:bg-green-700 transition-colors"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  )
}
