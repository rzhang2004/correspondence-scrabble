import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { validateAndScoreMove, PlacedTile } from "@/lib/scrabble/engine"
import { fillRack } from "@/lib/scrabble/tiles"
import { serializeBoard } from "@/lib/scrabble/board"
import { sendTurnNotification } from "@/lib/email"

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { gameId } = await params
  const userId = session.user.id
  const body = await req.json()
  const { type, tiles: placedTiles, exchangeTiles } = body

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      player1: { select: { id: true, username: true, email: true } },
      player2: { select: { id: true, username: true, email: true } },
    },
  })

  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 })
  if (game.player1Id !== userId && game.player2Id !== userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  if (game.status !== "ACTIVE")
    return NextResponse.json({ error: "Game is not active" }, { status: 400 })
  if (game.currentTurn !== userId)
    return NextResponse.json({ error: "Not your turn" }, { status: 400 })

  const isPlayer1 = game.player1Id === userId
  const myRack = isPlayer1 ? [...game.player1Rack] : [...game.player2Rack]
  let bag = [...game.tileBag]
  const nextTurn = isPlayer1 ? game.player2Id : game.player1Id
  const opponent = isPlayer1 ? game.player2 : game.player1

  if (type === "PASS") {
    const newPasses = game.consecutivePasses + 1
    const gameOver = newPasses >= 6 // both players passed 3 times each

    const [move] = await prisma.$transaction([
      prisma.move.create({
        data: { gameId, playerId: userId, type: "PASS", words: [], score: 0 },
      }),
      prisma.game.update({
        where: { id: gameId },
        data: {
          currentTurn: nextTurn,
          consecutivePasses: newPasses,
          status: gameOver ? "FINISHED" : "ACTIVE",
        },
      }),
    ])

    if (!gameOver) {
      sendTurnNotification({ toEmail: opponent.email!, toName: opponent.username, opponentName: session.user.username ?? "Opponent", gameId }).catch((err) => { console.error("sendTurnNotification failed:", err) })
    }

    return NextResponse.json({ ok: true, move })
  }

  if (type === "EXCHANGE") {
    if (!exchangeTiles || exchangeTiles.length === 0)
      return NextResponse.json({ error: "No tiles to exchange" }, { status: 400 })
    if (bag.length < 7)
      return NextResponse.json({ error: "Not enough tiles in bag to exchange" }, { status: 400 })

    // Verify player has these tiles
    const newRack = [...myRack]
    for (const tile of exchangeTiles) {
      const idx = newRack.indexOf(tile)
      if (idx === -1) return NextResponse.json({ error: `You don't have tile: ${tile}` }, { status: 400 })
      newRack.splice(idx, 1)
    }

    // Draw new tiles, put exchanged ones back
    const { drawn, remaining } = drawAndReturn(bag, exchangeTiles, exchangeTiles.length)
    const finalRack = [...newRack, ...drawn]
    bag = remaining

    await prisma.$transaction([
      prisma.move.create({
        data: { gameId, playerId: userId, type: "EXCHANGE", words: [], score: 0 },
      }),
      prisma.game.update({
        where: { id: gameId },
        data: {
          currentTurn: nextTurn,
          consecutivePasses: game.consecutivePasses + 1,
          tileBag: bag,
          ...(isPlayer1 ? { player1Rack: finalRack } : { player2Rack: finalRack }),
        },
      }),
    ])

    sendTurnNotification({ toEmail: opponent.email!, toName: opponent.username, opponentName: session.user.username ?? "Opponent", gameId }).catch((err) => { console.error("sendTurnNotification failed:", err) })
    return NextResponse.json({ ok: true, newRack: finalRack })
  }

  if (type === "PLACE") {
    if (!placedTiles || placedTiles.length === 0)
      return NextResponse.json({ error: "No tiles placed" }, { status: 400 })

    // Verify the player has all the tiles they're placing
    const tempRack = [...myRack]
    for (const tile of placedTiles as PlacedTile[]) {
      const tileInRack = tile.isBlank ? "?" : tile.letter.toUpperCase()
      const idx = tempRack.indexOf(tileInRack)
      if (idx === -1) return NextResponse.json({ error: `You don't have tile: ${tile.letter}` }, { status: 400 })
      tempRack.splice(idx, 1)
    }

    const result = validateAndScoreMove(game.boardState, placedTiles)
    if (!result.valid) return NextResponse.json({ error: result.error }, { status: 400 })

    // Fill rack from bag
    const { rack: newRack, bag: newBag } = fillRack(tempRack, bag)
    bag = newBag

    // Determine if game is over (bag empty and player used all tiles or rack is empty)
    const isRackEmpty = newRack.length === 0 && bag.length === 0

    // Calculate end-game deduction if game is over
    let winnerId: string | undefined
    let gameStatus: "ACTIVE" | "FINISHED" = "ACTIVE"
    const opponentRack = isPlayer1 ? game.player2Rack : game.player1Rack

    if (isRackEmpty) {
      gameStatus = "FINISHED"
      winnerId = userId
    }

    const newScore1 = game.player1Score + (isPlayer1 ? result.score! : 0)
    const newScore2 = game.player2Score + (!isPlayer1 ? result.score! : 0)

    await prisma.$transaction([
      prisma.move.create({
        data: {
          gameId,
          playerId: userId,
          type: "PLACE",
          tiles: placedTiles,
          words: result.words!,
          score: result.score!,
        },
      }),
      prisma.game.update({
        where: { id: gameId },
        data: {
          boardState: serializeBoard(result.newBoard!),
          currentTurn: nextTurn,
          consecutivePasses: 0,
          tileBag: bag,
          player1Score: newScore1,
          player2Score: newScore2,
          status: gameStatus,
          winnerId: winnerId ?? null,
          ...(isPlayer1 ? { player1Rack: newRack } : { player2Rack: newRack }),
        },
      }),
    ])

    if (gameStatus === "ACTIVE") {
      sendTurnNotification({ toEmail: opponent.email!, toName: opponent.username, opponentName: session.user.username ?? "Opponent", gameId }).catch((err) => { console.error("sendTurnNotification failed:", err) })
    }

    return NextResponse.json({
      ok: true,
      words: result.words,
      score: result.score,
      newRack,
      tilesLeft: bag.length,
    })
  }

  return NextResponse.json({ error: "Unknown move type" }, { status: 400 })
}

function drawAndReturn(bag: string[], returnTiles: string[], drawCount: number): { drawn: string[]; remaining: string[] } {
  const remaining = [...bag, ...returnTiles]
  // Shuffle
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[remaining[i], remaining[j]] = [remaining[j], remaining[i]]
  }
  const drawn = remaining.splice(0, drawCount)
  return { drawn, remaining }
}
