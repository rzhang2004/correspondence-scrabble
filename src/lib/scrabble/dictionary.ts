import fs from "fs"
import path from "path"

let wordSet: Set<string> | null = null

function loadDictionary(): Set<string> {
  if (wordSet) return wordSet

  const dictPath = path.join(process.cwd(), "data", "twl06.txt")
  if (!fs.existsSync(dictPath)) {
    console.warn("Dictionary file not found at data/twl06.txt. Run: node scripts/download-dictionary.mjs")
    wordSet = new Set()
    return wordSet
  }

  const content = fs.readFileSync(dictPath, "utf-8")
  wordSet = new Set(
    content
      .split(/\r?\n/)
      .map((w) => w.trim().toUpperCase())
      .filter((w) => w.length > 0)
  )
  console.log(`Dictionary loaded: ${wordSet.size} words`)
  return wordSet
}

export function isValidWord(word: string): boolean {
  const dict = loadDictionary()
  return dict.has(word.toUpperCase())
}

export function getDictionarySize(): number {
  return loadDictionary().size
}
