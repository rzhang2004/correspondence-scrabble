import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import GameClient from "./GameClient"

export const dynamic = "force-dynamic"

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const session = await auth()
  const userId = session!.user.id

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      player1: { select: { id: true, username: true } },
      player2: { select: { id: true, username: true } },
      moves: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!game) notFound()
  if (game.player1Id !== userId && game.player2Id !== userId) notFound()

  const isPlayer1 = game.player1Id === userId
  const myRack = isPlayer1 ? game.player1Rack : game.player2Rack

  return (
    <GameClient
      gameId={game.id}
      initialBoard={game.boardState as unknown as { letter: string | null; isBlank: boolean }[][]}
      initialRack={myRack}
      player1={game.player1}
      player2={game.player2}
      player1Score={game.player1Score}
      player2Score={game.player2Score}
      currentTurn={game.currentTurn}
      userId={userId}
      tilesLeft={game.tileBag.length}
      status={game.status}
      winnerId={game.winnerId}
      moves={game.moves.map((m) => ({
        id: m.id,
        playerId: m.playerId,
        type: m.type,
        words: m.words,
        score: m.score,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  )
}
