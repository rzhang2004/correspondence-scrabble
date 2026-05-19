import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { createEmptyBoard, serializeBoard } from "@/lib/scrabble/board"
import { createTileBag, fillRack } from "@/lib/scrabble/tiles"
import { sendGameInvite } from "@/lib/email"

// GET /api/games — list current user's games
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const games = await prisma.game.findMany({
    where: {
      OR: [{ player1Id: userId }, { player2Id: userId }],
    },
    include: {
      player1: { select: { id: true, username: true, image: true } },
      player2: { select: { id: true, username: true, image: true } },
      moves: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(games)
}

// POST /api/games — challenge a friend to a new game
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { opponentId } = await req.json()
  if (!opponentId) return NextResponse.json({ error: "opponentId required" }, { status: 400 })

  const userId = session.user.id
  if (opponentId === userId) return NextResponse.json({ error: "Cannot play yourself" }, { status: 400 })

  const opponent = await prisma.user.findUnique({ where: { id: opponentId } })
  if (!opponent) return NextResponse.json({ error: "Opponent not found" }, { status: 404 })

  // Verify they are friends
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, addresseeId: opponentId },
        { requesterId: opponentId, addresseeId: userId },
      ],
    },
  })
  if (!friendship) return NextResponse.json({ error: "You must be friends to start a game" }, { status: 403 })

  // Set up game state
  let bag = createTileBag()
  const p1Fill = fillRack([], bag)
  bag = p1Fill.bag
  const p2Fill = fillRack([], bag)
  bag = p2Fill.bag

  // Randomly decide who goes first
  const player1GoesFirst = Math.random() < 0.5
  const player1Id = player1GoesFirst ? userId : opponentId
  const player2Id = player1GoesFirst ? opponentId : userId

  const game = await prisma.game.create({
    data: {
      player1Id,
      player2Id,
      boardState: serializeBoard(createEmptyBoard()),
      tileBag: bag,
      player1Rack: player1GoesFirst ? p1Fill.rack : p2Fill.rack,
      player2Rack: player1GoesFirst ? p2Fill.rack : p1Fill.rack,
      currentTurn: player1Id,
    },
  })

  // Email the opponent
  const me = await prisma.user.findUnique({ where: { id: userId } })
  if (me && opponent.email) {
    await sendGameInvite({
      toEmail: opponent.email,
      toName: opponent.username,
      fromName: me.username,
      inviteId: game.id,
    }).catch(() => {})
  }

  return NextResponse.json(game, { status: 201 })
}
