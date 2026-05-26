import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { validateAndScoreMove, PlacedTile } from "@/lib/scrabble/engine"

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { gameId } = await params
  const userId = session.user.id
  const body = await req.json()
  const placedTiles = body.tiles as PlacedTile[] | undefined

  if (!placedTiles || placedTiles.length === 0) {
    return NextResponse.json({ valid: false, error: "No tiles placed" })
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { boardState: true, player1Id: true, player2Id: true },
  })
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 })
  if (game.player1Id !== userId && game.player2Id !== userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const result = validateAndScoreMove(game.boardState, placedTiles)
  return NextResponse.json(result.valid
    ? { valid: true, words: result.words, score: result.score }
    : { valid: false, error: result.error })
}
