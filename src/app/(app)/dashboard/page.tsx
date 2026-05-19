import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { formatDistanceToNow } from "@/lib/timeUtils"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user.id

  const games = await prisma.game.findMany({
    where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
    include: {
      player1: { select: { id: true, username: true } },
      player2: { select: { id: true, username: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const activeGames = games.filter((g) => g.status === "ACTIVE")
  const finishedGames = games.filter((g) => g.status === "FINISHED")
  const myTurnGames = activeGames.filter((g) => g.currentTurn === userId)
  const theirTurnGames = activeGames.filter((g) => g.currentTurn !== userId)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Your Games</h1>

      {activeGames.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg">No active games.</p>
          <p className="text-sm mt-1">
            <Link href="/friends" className="text-green-700 hover:underline">
              Challenge a friend
            </Link>{" "}
            to start playing!
          </p>
        </div>
      )}

      {myTurnGames.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Your turn ({myTurnGames.length})
          </h2>
          <div className="grid gap-3">
            {myTurnGames.map((game) => {
              const isP1 = game.player1Id === userId
              const opponent = isP1 ? game.player2 : game.player1
              const myScore = isP1 ? game.player1Score : game.player2Score
              const theirScore = isP1 ? game.player2Score : game.player1Score
              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="flex items-center justify-between bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-stone-800">vs {opponent.username}</span>
                    <span className="text-xs text-stone-400 ml-2">
                      {formatDistanceToNow(game.updatedAt)}
                    </span>
                  </div>
                  <div className="text-sm font-mono font-semibold text-stone-700">
                    {myScore} – {theirScore}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {theirTurnGames.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Waiting ({theirTurnGames.length})
          </h2>
          <div className="grid gap-3">
            {theirTurnGames.map((game) => {
              const isP1 = game.player1Id === userId
              const opponent = isP1 ? game.player2 : game.player1
              const myScore = isP1 ? game.player1Score : game.player2Score
              const theirScore = isP1 ? game.player2Score : game.player1Score
              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3 hover:bg-stone-50 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-stone-700">vs {opponent.username}</span>
                    <span className="text-xs text-stone-400 ml-2">
                      {formatDistanceToNow(game.updatedAt)}
                    </span>
                  </div>
                  <div className="text-sm font-mono text-stone-500">
                    {myScore} – {theirScore}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {finishedGames.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Finished
          </h2>
          <div className="grid gap-2">
            {finishedGames.slice(0, 5).map((game) => {
              const isP1 = game.player1Id === userId
              const opponent = isP1 ? game.player2 : game.player1
              const myScore = isP1 ? game.player1Score : game.player2Score
              const theirScore = isP1 ? game.player2Score : game.player1Score
              const won = game.winnerId === userId
              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="flex items-center justify-between bg-white border border-stone-100 rounded-xl px-4 py-3 hover:bg-stone-50 transition-colors opacity-75"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${won ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                      {won ? "WIN" : "LOSS"}
                    </span>
                    <span className="font-medium text-stone-600">vs {opponent.username}</span>
                  </div>
                  <div className="text-sm font-mono text-stone-500">
                    {myScore} – {theirScore}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
