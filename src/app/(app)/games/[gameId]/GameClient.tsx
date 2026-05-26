"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import ScrabbleBoard, { PendingTile } from "@/components/ScrabbleBoard"
import TileRack from "@/components/TileRack"

interface Player { id: string; username: string }
interface MoveRecord {
  id: string
  playerId: string
  type: string
  words: string[]
  score: number
  createdAt: string
}

interface Props {
  gameId: string
  initialBoard: { letter: string | null; isBlank: boolean }[][]
  initialRack: string[]
  player1: Player
  player2: Player
  player1Score: number
  player2Score: number
  currentTurn: string
  userId: string
  tilesLeft: number
  status: string
  winnerId: string | null
  moves: MoveRecord[]
}

export default function GameClient(props: Props) {
  const router = useRouter()
  const [board] = useState(props.initialBoard)
  const [rack, setRack] = useState(props.initialRack)
  const [pendingTiles, setPendingTiles] = useState<PendingTile[]>([])
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null)
  const [blankLetter, setBlankLetter] = useState<string | null>(null)
  const [showBlankPicker, setShowBlankPicker] = useState(false)
  const [pendingBlankPos, setPendingBlankPos] = useState<{row:number,col:number} | null>(null)
  const [exchangeMode, setExchangeMode] = useState(false)
  const [selectedForExchange, setSelectedForExchange] = useState<number[]>([])
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<{words:string[];score:number} | null>(null)
  const [preview, setPreview] = useState<{ valid: true; words: string[]; score: number } | { valid: false; error: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const isMyTurn = props.currentTurn === props.userId

  // Poll for opponent's moves while waiting. Skips when it's our turn, when the
  // game is over, or when the tab is hidden. Refreshes the server component if
  // the move count or whose-turn changed.
  useEffect(() => {
    if (isMyTurn || props.status !== "ACTIVE") return
    let cancelled = false
    const knownMoveCount = props.moves.length
    const knownTurn = props.currentTurn

    async function check() {
      if (document.hidden) return
      try {
        const res = await fetch(`/api/games/${props.gameId}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (data.moves.length !== knownMoveCount || data.currentTurn !== knownTurn) {
          router.refresh()
        }
      } catch { /* network blip — try again next tick */ }
    }

    const interval = setInterval(check, 3000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [isMyTurn, props.status, props.gameId, props.moves.length, props.currentTurn, router])

  // Live preview of pending move (score + validity). Debounced so we don't hit
  // the server on every tile placement.
  useEffect(() => {
    if (pendingTiles.length === 0) {
      setPreview(null)
      setPreviewLoading(false)
      return
    }
    setPreviewLoading(true)
    let cancelled = false
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/games/${props.gameId}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tiles: pendingTiles }),
        })
        const data = await res.json()
        if (cancelled) return
        setPreview(data)
      } catch {
        if (!cancelled) setPreview({ valid: false, error: "Preview unavailable" })
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(handle) }
  }, [pendingTiles, props.gameId])
  const isPlayer1 = props.player1.id === props.userId
  const me = isPlayer1 ? props.player1 : props.player2
  const opponent = isPlayer1 ? props.player2 : props.player1
  const myScore = isPlayer1 ? props.player1Score : props.player2Score
  const theirScore = isPlayer1 ? props.player2Score : props.player1Score
  const isFinished = props.status === "FINISHED"

  const handleRackSelect = useCallback((index: number) => {
    if (exchangeMode) {
      setSelectedForExchange((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      )
      return
    }
    setSelectedRackIndex((prev) => (prev === index ? null : index))
  }, [exchangeMode])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (selectedRackIndex === null) return

    const tile = rack[selectedRackIndex]
    if (tile === "?") {
      // Need to ask what letter the blank should be
      setPendingBlankPos({ row, col })
      setShowBlankPicker(true)
      return
    }

    placeTile(row, col, tile, false, selectedRackIndex)
  }, [selectedRackIndex, rack]) // eslint-disable-line react-hooks/exhaustive-deps

  function placeTile(row: number, col: number, letter: string, isBlank: boolean, rackIndex: number) {
    setPendingTiles((prev) => [...prev, { row, col, letter: letter.toUpperCase(), isBlank }])
    setRack((prev) => prev.filter((_, i) => i !== rackIndex))
    setSelectedRackIndex(null)
    setError("")
  }

  function confirmBlank(letter: string) {
    if (!pendingBlankPos || selectedRackIndex === null) return
    placeTile(pendingBlankPos.row, pendingBlankPos.col, letter, true, selectedRackIndex)
    setShowBlankPicker(false)
    setPendingBlankPos(null)
    setBlankLetter(null)
  }

  function recallTile(row: number, col: number) {
    const tile = pendingTiles.find((t) => t.row === row && t.col === col)
    if (!tile) return
    setPendingTiles((prev) => prev.filter((t) => !(t.row === row && t.col === col)))
    setRack((prev) => [...prev, tile.isBlank ? "?" : tile.letter])
    setSelectedRackIndex(null)
  }

  function recallAll() {
    const returned = pendingTiles.map((t) => t.isBlank ? "?" : t.letter)
    setRack((prev) => [...prev, ...returned])
    setPendingTiles([])
    setSelectedRackIndex(null)
  }

  async function submitMove() {
    if (pendingTiles.length === 0) return
    setSubmitting(true)
    setError("")

    const res = await fetch(`/api/games/${props.gameId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PLACE", tiles: pendingTiles }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Move failed")
      recallAll()
    } else {
      setLastResult({ words: data.words, score: data.score })
      setPendingTiles([])
      setRack(data.newRack)
      setSelectedRackIndex(null)
      setTimeout(() => router.refresh(), 1500)
    }
    setSubmitting(false)
  }

  async function submitPass() {
    setSubmitting(true)
    setError("")
    await fetch(`/api/games/${props.gameId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PASS" }),
    })
    setSubmitting(false)
    router.refresh()
  }

  async function submitExchange() {
    if (selectedForExchange.length === 0) return
    setSubmitting(true)
    setError("")
    const tiles = selectedForExchange.map((i) => rack[i])
    const res = await fetch(`/api/games/${props.gameId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "EXCHANGE", exchangeTiles: tiles }),
    })
    const data = await res.json()
    if (res.ok) {
      setRack(data.newRack)
      setExchangeMode(false)
      setSelectedForExchange([])
      router.refresh()
    } else {
      setError(data.error)
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Score header */}
      <div className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3">
        <div className="text-center">
          <div className={`font-bold text-lg ${isPlayer1 ? "text-green-700" : "text-stone-700"}`}>
            {me.username}
          </div>
          <div className="text-2xl font-bold">{myScore}</div>
        </div>
        <div className="text-center text-stone-400">
          <div className="text-xs">Tiles left</div>
          <div className="font-semibold">{props.tilesLeft}</div>
        </div>
        <div className="text-center">
          <div className={`font-bold text-lg ${!isPlayer1 ? "text-green-700" : "text-stone-700"}`}>
            {opponent.username}
          </div>
          <div className="text-2xl font-bold">{theirScore}</div>
        </div>
      </div>

      {/* Status banner */}
      {isFinished ? (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-center">
          {props.winnerId === props.userId
            ? <span className="font-bold text-green-700">You won! 🎉</span>
            : props.winnerId
            ? <span className="font-semibold text-stone-600">You lost. Better luck next time!</span>
            : <span className="font-semibold text-stone-600">Game over — it&apos;s a tie!</span>
          }
        </div>
      ) : isMyTurn ? (
        <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-2 text-center text-green-700 font-semibold text-sm">
          Your turn
        </div>
      ) : (
        <div className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-2 text-center text-stone-500 text-sm">
          Waiting for {opponent.username}…
        </div>
      )}

      {/* Live preview of pending move */}
      {pendingTiles.length > 0 && !lastResult && (
        preview === null || previewLoading ? (
          <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-center text-stone-500 text-sm">
            Checking move…
          </div>
        ) : preview.valid ? (
          <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-2 text-center text-sm">
            <span className="text-green-800 font-semibold">{preview.words.join(", ")}</span>
            <span className="text-green-700"> — {preview.score} pts</span>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center text-red-700 text-sm">
            {preview.error}
          </div>
        )
      )}

      {/* Last result toast */}
      {lastResult && (
        <div className="bg-green-100 border border-green-300 rounded-xl px-4 py-3 text-center">
          <span className="text-green-800 font-semibold">
            {lastResult.words.join(", ")} — {lastResult.score} pts
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Board */}
      <ScrabbleBoard
        board={board}
        pendingTiles={pendingTiles}
        selectedTile={selectedRackIndex !== null ? rack[selectedRackIndex] : null}
        onCellClick={handleCellClick}
        onRecallTile={recallTile}
        isMyTurn={isMyTurn && !isFinished}
      />

      {/* Tile rack */}
      {!isFinished && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-4">
          <TileRack
            tiles={rack}
            selectedIndex={exchangeMode ? null : selectedRackIndex}
            onSelect={handleRackSelect}
            disabled={!isMyTurn}
          />

          {/* Exchange tile selection */}
          {exchangeMode && (
            <div className="flex gap-1.5 justify-center flex-wrap">
              {rack.map((tile, i) => (
                <button
                  key={i}
                  onClick={() => handleRackSelect(i)}
                  className={`w-10 h-12 rounded font-bold text-stone-800 border-2 transition-all ${
                    selectedForExchange.includes(i)
                      ? "bg-blue-300 border-blue-500"
                      : "bg-amber-200 border-amber-400"
                  }`}
                >
                  {tile === "?" ? "?" : tile}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {isMyTurn && (
            <div className="flex gap-2 flex-wrap justify-center">
              {pendingTiles.length > 0 && (
                <>
                  <button
                    onClick={submitMove}
                    disabled={submitting || previewLoading || (preview !== null && !preview.valid)}
                    className="bg-green-700 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? "Playing…" : preview && preview.valid ? `Play for ${preview.score}` : "Play word"}
                  </button>
                  <button
                    onClick={recallAll}
                    disabled={submitting}
                    className="bg-stone-200 text-stone-700 px-4 py-2 rounded-lg text-sm hover:bg-stone-300 disabled:opacity-60 transition-colors"
                  >
                    Recall
                  </button>
                </>
              )}
              {pendingTiles.length === 0 && !exchangeMode && (
                <>
                  <button
                    onClick={submitPass}
                    disabled={submitting}
                    className="bg-stone-200 text-stone-700 px-4 py-2 rounded-lg text-sm hover:bg-stone-300 disabled:opacity-60 transition-colors"
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => { setExchangeMode(true); setSelectedRackIndex(null) }}
                    disabled={submitting || props.tilesLeft < 7}
                    className="bg-stone-200 text-stone-700 px-4 py-2 rounded-lg text-sm hover:bg-stone-300 disabled:opacity-60 transition-colors"
                  >
                    Exchange
                  </button>
                </>
              )}
              {exchangeMode && (
                <>
                  <button
                    onClick={submitExchange}
                    disabled={submitting || selectedForExchange.length === 0}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-500 disabled:opacity-60 transition-colors"
                  >
                    Exchange ({selectedForExchange.length})
                  </button>
                  <button
                    onClick={() => { setExchangeMode(false); setSelectedForExchange([]) }}
                    className="bg-stone-200 text-stone-700 px-4 py-2 rounded-lg text-sm hover:bg-stone-300 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Move history */}
      {props.moves.length > 0 && (
        <section className="bg-white border border-stone-200 rounded-xl p-4">
          <h3 className="font-semibold text-stone-600 text-sm mb-3">Move history</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[...props.moves].reverse().map((m) => {
              const isMe = m.playerId === props.userId
              const player = isMe ? me.username : opponent.username
              return (
                <div key={m.id} className="flex justify-between text-sm">
                  <span className={isMe ? "text-green-700 font-medium" : "text-stone-500"}>
                    {player}:{" "}
                    {m.type === "PLACE"
                      ? m.words.join(", ")
                      : m.type === "EXCHANGE"
                      ? "exchanged tiles"
                      : "passed"}
                  </span>
                  {m.score > 0 && (
                    <span className="font-mono font-semibold text-stone-700">+{m.score}</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Blank tile picker modal */}
      {showBlankPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="font-bold text-stone-800 mb-4 text-center">Choose a letter for your blank</h3>
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => (
                <button
                  key={l}
                  onClick={() => { setBlankLetter(l); confirmBlank(l) }}
                  className={`h-9 rounded font-bold text-sm border-2 transition-colors ${
                    blankLetter === l
                      ? "bg-amber-400 border-amber-600"
                      : "bg-amber-100 border-amber-300 hover:bg-amber-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setShowBlankPicker(false); setPendingBlankPos(null) }}
              className="w-full text-stone-500 text-sm hover:text-stone-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
