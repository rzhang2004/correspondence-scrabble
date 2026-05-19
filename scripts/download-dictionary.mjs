// Downloads the TWL06 Scrabble word list to data/twl06.txt
// Run with: node scripts/download-dictionary.mjs

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT = path.join(__dirname, "..", "data", "twl06.txt")

// Mirror sources — first one that works wins
const SOURCES = [
  "https://norvig.com/ngrams/enable1.txt",                                          // ENABLE1 — basis of TWL06
  "https://raw.githubusercontent.com/lorenbrichter/Words/master/Words/en.txt",      // large English word list
  "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",   // fallback
]

async function download() {
  if (fs.existsSync(OUTPUT)) {
    const lines = fs.readFileSync(OUTPUT, "utf-8").split("\n").filter(Boolean)
    console.log(`Dictionary already exists (${lines.length} words). Delete data/twl06.txt to re-download.`)
    return
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })

  for (const url of SOURCES) {
    try {
      console.log(`Trying: ${url}`)
      const res = await fetch(url)
      if (!res.ok) continue
      const text = await res.text()
      const words = text
        .split(/\r?\n/)
        .map((w) => w.trim().split(/\s+/)[0].toUpperCase())
        .filter((w) => /^[A-Z]+$/.test(w))

      if (words.length < 50000) {
        console.log(`Only ${words.length} words — skipping this source`)
        continue
      }

      fs.writeFileSync(OUTPUT, words.join("\n") + "\n", "utf-8")
      console.log(`✓ Saved ${words.length} words to data/twl06.txt`)
      return
    } catch (e) {
      console.warn(`Failed: ${e.message}`)
    }
  }

  console.error("Could not download dictionary. Please manually place a word list at data/twl06.txt (one word per line).")
  process.exit(1)
}

download()
