import { Board, BOARD_SIZE, getCellBonus, deserializeBoard } from "./board"
import { TILE_VALUES } from "./tiles"
import { isValidWord } from "./dictionary"

export interface PlacedTile {
  row: number
  col: number
  letter: string  // the actual letter (even for blanks)
  isBlank: boolean
}

export interface MoveResult {
  valid: boolean
  error?: string
  words?: string[]
  score?: number
  newBoard?: Board
}

function isBoardEmpty(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c].letter !== null) return false
  return true
}

function getWordAt(board: Board, startRow: number, startCol: number, horizontal: boolean): { word: string; cells: {row:number,col:number}[] } {
  const cells: {row:number,col:number}[] = []
  let r = startRow
  let c = startCol

  // Walk back to start of word
  while (r >= 0 && c >= 0 && board[r][c].letter !== null) {
    if (horizontal) c--; else r--
  }
  if (horizontal) c++; else r++

  // Walk forward collecting letters
  let word = ""
  while (r < BOARD_SIZE && c < BOARD_SIZE && board[r][c].letter !== null) {
    word += board[r][c].letter
    cells.push({ row: r, col: c })
    if (horizontal) c++; else r++
  }
  return { word, cells }
}

function scoreWord(
  board: Board,
  wordCells: {row:number,col:number}[],
  newTilePositions: Set<string>
): number {
  let wordMultiplier = 1
  let wordScore = 0

  for (const { row, col } of wordCells) {
    const cell = board[row][col]
    const letterValue = cell.isBlank ? 0 : (TILE_VALUES[cell.letter!] ?? 0)
    const key = `${row},${col}`
    const isNew = newTilePositions.has(key)

    if (!isNew) {
      wordScore += letterValue
      continue
    }

    const bonus = getCellBonus(row, col)
    if (bonus === "DL") wordScore += letterValue * 2
    else if (bonus === "TL") wordScore += letterValue * 3
    else wordScore += letterValue

    if (bonus === "DW" || bonus === "star") wordMultiplier *= 2
    else if (bonus === "TW") wordMultiplier *= 3
  }

  return wordScore * wordMultiplier
}

export function validateAndScoreMove(
  boardData: unknown,
  placedTiles: PlacedTile[]
): MoveResult {
  if (placedTiles.length === 0) return { valid: false, error: "No tiles placed" }

  const board = deserializeBoard(boardData)

  // Check all placements are on empty cells
  for (const tile of placedTiles) {
    if (tile.row < 0 || tile.row >= BOARD_SIZE || tile.col < 0 || tile.col >= BOARD_SIZE)
      return { valid: false, error: "Tile out of bounds" }
    if (board[tile.row][tile.col].letter !== null)
      return { valid: false, error: `Cell (${tile.row},${tile.col}) is already occupied` }
  }

  // Check all tiles are in the same row or column
  const rows = new Set(placedTiles.map((t) => t.row))
  const cols = new Set(placedTiles.map((t) => t.col))
  const horizontal = rows.size === 1
  const vertical = cols.size === 1
  if (!horizontal && !vertical)
    return { valid: false, error: "All tiles must be placed in the same row or column" }
  if (placedTiles.length > 1 && !horizontal && !vertical)
    return { valid: false, error: "Tiles must be in a line" }

  // Place tiles on a copy of the board
  const newBoard: Board = board.map((row) => row.map((cell) => ({ ...cell })))
  const newTilePositions = new Set<string>()
  for (const tile of placedTiles) {
    newBoard[tile.row][tile.col] = { letter: tile.letter.toUpperCase(), isBlank: tile.isBlank }
    newTilePositions.add(`${tile.row},${tile.col}`)
  }

  const isEmpty = isBoardEmpty(board)

  // Check connectivity
  if (isEmpty) {
    // First move must cover center square
    const coversCenter = placedTiles.some((t) => t.row === 7 && t.col === 7)
    if (!coversCenter)
      return { valid: false, error: "First move must cover the center square" }
    if (placedTiles.length < 2)
      return { valid: false, error: "First move must place at least 2 tiles" }
  } else {
    // Must connect to existing tiles
    const connects = placedTiles.some(({ row, col }) => {
      const neighbors = [[row-1,col],[row+1,col],[row,col-1],[row,col+1]]
      return neighbors.some(([r,c]) =>
        r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE &&
        board[r][c].letter !== null
      )
    })
    if (!connects)
      return { valid: false, error: "Tiles must connect to existing tiles on the board" }
  }

  // Check main word is contiguous (no gaps)
  if (horizontal) {
    const row = placedTiles[0].row
    const minCol = Math.min(...placedTiles.map((t) => t.col))
    const maxCol = Math.max(...placedTiles.map((t) => t.col))
    for (let c = minCol; c <= maxCol; c++) {
      if (newBoard[row][c].letter === null)
        return { valid: false, error: "Tiles must form a contiguous word" }
    }
  } else {
    const col = placedTiles[0].col
    const minRow = Math.min(...placedTiles.map((t) => t.row))
    const maxRow = Math.max(...placedTiles.map((t) => t.row))
    for (let r = minRow; r <= maxRow; r++) {
      if (newBoard[r][col].letter === null)
        return { valid: false, error: "Tiles must form a contiguous word" }
    }
  }

  // Extract all words formed
  const wordsFormed: { word: string; cells: {row:number,col:number}[] }[] = []

  // Main word
  const firstTile = placedTiles[0]
  const mainWord = getWordAt(newBoard, firstTile.row, firstTile.col, horizontal)
  if (mainWord.word.length >= 2) wordsFormed.push(mainWord)

  // Cross words for each placed tile (perpendicular to the main word direction).
  // Dedup across cross words only — never against the main word, since the main
  // word runs in the opposite direction and can coincidentally share a start cell.
  const seenCrossStarts = new Set<string>()
  for (const tile of placedTiles) {
    const cross = getWordAt(newBoard, tile.row, tile.col, !horizontal)
    if (cross.word.length >= 2) {
      const key = `${cross.cells[0].row},${cross.cells[0].col}`
      if (!seenCrossStarts.has(key)) {
        seenCrossStarts.add(key)
        wordsFormed.push(cross)
      }
    }
  }

  // Validate all words
  for (const { word } of wordsFormed) {
    if (!isValidWord(word))
      return { valid: false, error: `"${word}" is not a valid Scrabble word` }
  }

  // Score
  let totalScore = 0
  for (const { cells } of wordsFormed) {
    totalScore += scoreWord(newBoard, cells, newTilePositions)
  }

  // Bingo bonus (7 tiles placed)
  if (placedTiles.length === 7) totalScore += 50

  return {
    valid: true,
    words: wordsFormed.map((w) => w.word),
    score: totalScore,
    newBoard,
  }
}
