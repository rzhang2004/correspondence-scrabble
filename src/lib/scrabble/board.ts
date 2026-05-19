export type CellBonus = "TW" | "DW" | "TL" | "DL" | "star" | null

export interface BoardCell {
  letter: string | null  // uppercase letter, or null if empty
  isBlank: boolean       // true if placed as a blank tile
}

export type Board = BoardCell[][]

export const BOARD_SIZE = 15

// Premium square positions [row, col]
const TW_SQUARES = new Set([
  "0,0","0,7","0,14","7,0","7,14","14,0","14,7","14,14",
])
const DW_SQUARES = new Set([
  "1,1","2,2","3,3","4,4","1,13","2,12","3,11","4,10",
  "10,4","11,3","12,2","13,1","10,10","11,11","12,12","13,13",
])
const TL_SQUARES = new Set([
  "1,5","1,9","5,1","5,5","5,9","5,13",
  "9,1","9,5","9,9","9,13","13,5","13,9",
])
const DL_SQUARES = new Set([
  "0,3","0,11","2,6","2,8","3,0","3,7","3,14",
  "6,2","6,6","6,8","6,12","7,3","7,11",
  "8,2","8,6","8,8","8,12","11,0","11,7","11,14",
  "12,6","12,8","14,3","14,11",
])

export function getCellBonus(row: number, col: number): CellBonus {
  const key = `${row},${col}`
  if (row === 7 && col === 7) return "star"
  if (TW_SQUARES.has(key)) return "TW"
  if (DW_SQUARES.has(key)) return "DW"
  if (TL_SQUARES.has(key)) return "TL"
  if (DL_SQUARES.has(key)) return "DL"
  return null
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ letter: null, isBlank: false }))
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeBoard(board: Board): any {
  return board
}

export function deserializeBoard(data: unknown): Board {
  return data as Board
}
