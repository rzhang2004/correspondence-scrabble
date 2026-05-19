"use client"

import { getCellBonus } from "@/lib/scrabble/board"

export interface PendingTile {
  row: number
  col: number
  letter: string
  isBlank: boolean
}

interface BoardCell {
  letter: string | null
  isBlank: boolean
}

interface Props {
  board: BoardCell[][]
  pendingTiles: PendingTile[]
  selectedTile: string | null  // letter from rack, or null
  onCellClick: (row: number, col: number) => void
  onRecallTile: (row: number, col: number) => void
  isMyTurn: boolean
}

const BONUS_STYLES: Record<string, string> = {
  TW: "bg-red-600 text-white text-[9px] font-bold",
  DW: "bg-pink-400 text-white text-[9px] font-bold",
  TL: "bg-blue-700 text-white text-[9px] font-bold",
  DL: "bg-sky-300 text-stone-800 text-[9px] font-bold",
  star: "bg-pink-400 text-white text-base",
}

const BONUS_LABELS: Record<string, string> = {
  TW: "3W", DW: "2W", TL: "3L", DL: "2L", star: "★",
}

export default function ScrabbleBoard({ board, pendingTiles, selectedTile, onCellClick, onRecallTile, isMyTurn }: Props) {
  const pendingMap = new Map(pendingTiles.map((t) => [`${t.row},${t.col}`, t]))

  function handleCellClick(row: number, col: number) {
    const pending = pendingMap.get(`${row},${col}`)
    if (pending) {
      onRecallTile(row, col)
      return
    }
    if (isMyTurn && selectedTile !== null && board[row][col].letter === null) {
      onCellClick(row, col)
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="grid gap-[1px] bg-stone-400 border border-stone-400 rounded mx-auto"
        style={{
          gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
          width: "min(100%, 480px)",
          aspectRatio: "1/1",
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`
            const pending = pendingMap.get(key)
            const bonus = getCellBonus(r, c)
            const hasTile = cell.letter !== null || pending

            let cellClass = "flex items-center justify-center cursor-default select-none relative "
            if (!hasTile) {
              cellClass += bonus ? BONUS_STYLES[bonus] : "bg-green-100"
              if (isMyTurn && selectedTile !== null && !cell.letter) {
                cellClass += " hover:bg-green-200 cursor-pointer"
              }
            } else {
              cellClass += "bg-amber-100"
              if (pending) cellClass += " ring-2 ring-amber-500 cursor-pointer"
            }

            return (
              <div
                key={key}
                className={cellClass}
                onClick={() => handleCellClick(r, c)}
                title={!hasTile && bonus ? BONUS_LABELS[bonus] : undefined}
              >
                {hasTile ? (
                  <TileCell
                    letter={pending ? pending.letter : cell.letter!}
                    isBlank={pending ? pending.isBlank : cell.isBlank}
                    isPending={!!pending}
                  />
                ) : bonus ? (
                  <span className="leading-none">{BONUS_LABELS[bonus]}</span>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function TileCell({ letter, isBlank, isPending }: { letter: string; isBlank: boolean; isPending: boolean }) {
  return (
    <div className={`w-full h-full flex items-center justify-center font-bold text-stone-800 ${isPending ? "bg-amber-300" : "bg-amber-200"} rounded-sm`}>
      <span className="text-xs sm:text-sm leading-none">{letter}</span>
      {isBlank && <span className="absolute bottom-0 right-0 text-[7px] text-stone-400">*</span>}
    </div>
  )
}
