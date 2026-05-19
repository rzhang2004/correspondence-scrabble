"use client"

import { TILE_VALUES } from "@/lib/scrabble/tiles"

interface Props {
  tiles: string[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  disabled: boolean
}

export default function TileRack({ tiles, selectedIndex, onSelect, disabled }: Props) {
  return (
    <div className="flex gap-1.5 justify-center flex-wrap">
      {tiles.map((tile, i) => {
        const isSelected = selectedIndex === i
        const value = TILE_VALUES[tile] ?? 0
        return (
          <button
            key={i}
            onClick={() => !disabled && onSelect(i)}
            disabled={disabled}
            className={`relative w-10 h-12 sm:w-12 sm:h-14 rounded flex flex-col items-center justify-center font-bold text-stone-800 border-2 transition-all select-none
              ${isSelected
                ? "bg-amber-400 border-amber-600 scale-110 shadow-lg z-10"
                : "bg-amber-200 border-amber-400 hover:bg-amber-300 hover:scale-105"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span className="text-base sm:text-lg leading-none">{tile === "?" ? "" : tile}</span>
            <span className="absolute bottom-0.5 right-1 text-[9px] text-stone-600 leading-none">{value || ""}</span>
          </button>
        )
      })}
    </div>
  )
}
