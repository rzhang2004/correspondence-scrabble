import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { gameId } = await params
  const userId = session.user.id

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      player1: { select: { id: true, username: true, image: true } },
      player2: { select: { id: true, username: true, image: true } },
      moves: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 })
  if (game.player1Id !== userId && game.player2Id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // Only send the current player's rack
  const isPlayer1 = game.player1Id === userId
  const myRack = isPlayer1 ? game.player1Rack : game.player2Rack

  return NextResponse.json({ ...game, myRack, player1Rack: undefined, player2Rack: undefined })
}
