/**
 * Downloads Scryfall bulk data and creates a local SQLite database
 * of Pauper-legal + banned cards for the MTGO deck normalizer.
 *
 * Run with: bun run scripts/download-pauper-cards.ts
 *
 * This script:
 * 1. Fetches Scryfall's Oracle Cards bulk data (~168 MB JSON)
 * 2. Filters to Pauper-legal and Pauper-banned cards (~10,684 cards)
 * 3. Creates SQLite database (~3-4 MB) with full card data
 * 4. Creates indexes for fast normalized name lookups
 */

import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs'
import { pipeline } from 'stream/promises'
import { Database } from 'bun:sqlite'
import { readFile } from 'fs/promises'

const BULK_DATA_API = 'https://api.scryfall.com/bulk-data'
const DB_PATH = './server/database/cards.db'
const TEMP_FILE = './server/database/oracle-cards.json'

interface BulkDataInfo {
  object: string
  type: string
  download_uri: string
  updated_at: string
  size: number
}

interface ScryfallCard {
  id: string
  name: string
  type_line: string
  mana_cost?: string
  oracle_text?: string
  colors?: string[]
  color_identity?: string[]
  keywords?: string[]
  legalities: {
    pauper?: string
    [key: string]: string | undefined
  }
  rarity: string
  set: string
  set_name: string
  collector_number: string
  image_uris?: {
    small?: string
    normal?: string
    large?: string
    png?: string
    art_crop?: string
    border_crop?: string
  }
  card_faces?: Array<{
    name: string
    type_line: string
    mana_cost?: string
    oracle_text?: string
    colors?: string[]
    image_uris?: {
      small?: string
      normal?: string
      large?: string
      png?: string
      art_crop?: string
      border_crop?: string
    }
    power?: string
    toughness?: string
    loyalty?: string
  }>
  layout: string
  cmc: number
  power?: string
  toughness?: string
  loyalty?: string
}

/**
 * Normalize card name for case/diacritic-insensitive lookups
 */
function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // Decompose diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/['-]/g, '') // Remove hyphens and apostrophes
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}

async function fetchBulkDataInfo(): Promise<BulkDataInfo> {
  console.log('📡 Fetching bulk data information...')
  const response = await fetch(BULK_DATA_API)
  const data = await response.json()

  // Find the Oracle Cards bulk data
  const oracleCards = data.data.find((item: BulkDataInfo) => item.type === 'oracle_cards')

  if (!oracleCards) {
    throw new Error('Oracle Cards bulk data not found')
  }

  console.log(`✅ Found bulk data (${(oracleCards.size / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`📅 Last updated: ${oracleCards.updated_at}`)

  return oracleCards
}

async function downloadBulkData(downloadUri: string): Promise<void> {
  console.log('⬇️  Downloading bulk data (this may take a minute)...')

  // Ensure directory exists
  if (!existsSync('./server/database')) {
    mkdirSync('./server/database', { recursive: true })
  }

  const response = await fetch(downloadUri)
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.statusText}`)
  }

  // Download file
  const fileStream = createWriteStream(TEMP_FILE)
  await pipeline(
    /* eslint-disable @typescript-eslint/no-explicit-any */
    response.body as any,
    fileStream
  )

  const sizeMB = (statSync(TEMP_FILE).size / 1024 / 1024).toFixed(2)
  console.log(`✅ Download complete (${sizeMB} MB)`)
}

async function createDatabase(): Promise<Database> {
  console.log('🗄️  Creating SQLite database...')

  const db = new Database(DB_PATH, { create: true })

  // Create cards table with full Scryfall data
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_normalized TEXT NOT NULL,
      type_line TEXT NOT NULL,
      mana_cost TEXT,
      oracle_text TEXT,
      colors TEXT,
      color_identity TEXT,
      keywords TEXT,
      legalities TEXT NOT NULL,
      rarity TEXT NOT NULL,
      set_code TEXT NOT NULL,
      set_name TEXT NOT NULL,
      collector_number TEXT NOT NULL,
      image_uris TEXT,
      card_faces TEXT,
      layout TEXT NOT NULL,
      cmc REAL NOT NULL,
      power TEXT,
      toughness TEXT,
      loyalty TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_name ON cards(name);
    CREATE INDEX IF NOT EXISTS idx_name_normalized ON cards(name_normalized);
    CREATE INDEX IF NOT EXISTS idx_type_line ON cards(type_line);
  `)

  // Create name_mappings table for tracking user input -> canonical name
  db.exec(`
    CREATE TABLE IF NOT EXISTS name_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input_name TEXT NOT NULL UNIQUE,
      canonical_name TEXT NOT NULL,
      normalized_input TEXT NOT NULL,
      normalized_canonical TEXT NOT NULL,
      hit_count INTEGER DEFAULT 1,
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_input_name ON name_mappings(input_name);
    CREATE INDEX IF NOT EXISTS idx_normalized_input ON name_mappings(normalized_input);
  `)

  // Create metadata table
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  console.log('✅ Database schema created')

  return db
}

async function importPauperCards(db: Database): Promise<void> {
  console.log('📖 Reading and filtering cards...')

  const fileContent = await readFile(TEMP_FILE, 'utf-8')
  const allCards: ScryfallCard[] = JSON.parse(fileContent)

  // Filter Pauper-legal and Banned cards
  const pauperCards = allCards.filter(card =>
    card.legalities.pauper === 'legal' || card.legalities.pauper === 'banned'
  )

  console.log(`✅ Found ${pauperCards.length} Pauper-legal + Banned cards out of ${allCards.length} total`)

  // Prepare insert statement
  const insert = db.prepare(`
    INSERT OR REPLACE INTO cards (
      id, name, name_normalized, type_line, mana_cost, oracle_text,
      colors, color_identity, keywords, legalities, rarity,
      set_code, set_name, collector_number, image_uris, card_faces,
      layout, cmc, power, toughness, loyalty, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  console.log('💾 Inserting cards into database...')

  // Use transaction for batch insert
  const insertMany = db.transaction((cards: ScryfallCard[]) => {
    for (const card of cards) {
      const imageUris = card.image_uris ? JSON.stringify(card.image_uris) : null
      const cardFaces = card.card_faces ? JSON.stringify(card.card_faces) : null
      const colors = JSON.stringify(card.colors || [])
      const colorIdentity = JSON.stringify(card.color_identity || [])
      const keywords = JSON.stringify(card.keywords || [])
      const legalities = JSON.stringify(card.legalities)
      const nameNormalized = normalizeCardName(card.name)
      const now = new Date().toISOString()

      insert.run(
        card.id,
        card.name,
        nameNormalized,
        card.type_line,
        card.mana_cost || null,
        card.oracle_text || null,
        colors,
        colorIdentity,
        keywords,
        legalities,
        card.rarity,
        card.set,
        card.set_name,
        card.collector_number,
        imageUris,
        cardFaces,
        card.layout,
        card.cmc,
        card.power || null,
        card.toughness || null,
        card.loyalty || null,
        now
      )
    }
  })

  insertMany(pauperCards)

  // Store metadata
  db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(
    'last_update',
    new Date().toISOString()
  )
  db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(
    'total_cards',
    pauperCards.length.toString()
  )
  db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(
    'scryfall_version',
    'oracle_cards'
  )

  console.log('✅ Cards imported successfully')
}

async function main() {
  try {
    console.log('🚀 Starting MTGO Pauper Card Database Setup...\n')

    // Step 1: Fetch bulk data info
    const bulkInfo = await fetchBulkDataInfo()

    // Step 2: Download bulk data
    await downloadBulkData(bulkInfo.download_uri)

    // Step 3: Create database
    const db = await createDatabase()

    // Step 4: Import Pauper cards
    await importPauperCards(db)

    // Step 5: Show stats
    const stats = db.prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number }
    const dbSizeMB = (statSync(DB_PATH).size / 1024 / 1024).toFixed(2)

    console.log('\n📊 Database Statistics:')
    console.log(`   ├─ Cards: ${stats.count}`)
    console.log(`   ├─ Database size: ${dbSizeMB} MB`)
    console.log(`   ├─ Temp file size: ${(statSync(TEMP_FILE).size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   └─ Database path: ${DB_PATH}`)

    db.close()

    console.log('\n✨ Done! Database ready.')
    console.log('\n💡 Next steps:')
    console.log('   1. The database has been created at: server/database/cards.db')
    console.log('   2. You can delete the temp file: server/database/oracle-cards.json')
    console.log('   3. The database will be committed to git (tracked)')
    console.log('   4. The temp file is gitignored (not tracked)')
    console.log('\n🚀 Run your app with: bun run dev')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
