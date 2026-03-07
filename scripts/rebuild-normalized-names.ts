/**
 * Re-normalize all card names in the database to handle DFC front faces
 * Run with: bun run scripts/rebuild-normalized-names.ts
 */

import { Database } from 'bun:sqlite'

const DB_PATH = './server/database/cards.db'

/**
 * Get the front face of a double-faced card (DFC)
 */
function getFrontFace(name: string): string {
  return name.split('//')[0]?.trim() || name.trim()
}

/**
 * Normalize card name (with front face extraction)
 */
function normalizeCardName(name: string): string {
  return getFrontFace(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function rebuildNormalizedNames() {
  console.log('🔧 Rebuilding normalized card names...\n')

  const db = new Database(DB_PATH)

  // Get all cards
  const cards = db.prepare('SELECT id, name FROM cards').all() as Array<{ id: string, name: string }>

  console.log(`📊 Found ${cards.length} cards\n`)

  // Update normalized names
  const update = db.prepare('UPDATE cards SET name_normalized = ? WHERE id = ?')

  const updateMany = db.transaction((cards: Array<{ id: string, name: string }>) => {
    for (const card of cards) {
      const normalized = normalizeCardName(card.name)
      update.run(normalized, card.id)
    }
  })

  console.log('💾 Updating normalized names...')
  updateMany(cards)

  // Show some examples
  console.log('\n✅ Updated! Sample normalized names:\n')

  const samples = db.prepare(`
    SELECT name, name_normalized FROM cards 
    WHERE name LIKE '%//%'
    ORDER BY RANDOM()
    LIMIT 5
  `).all() as Array<{ name: string, name_normalized: string }>

  for (const sample of samples) {
    console.log(`   "${sample.name}"`)
    console.log(`   → "${sample.name_normalized}"\n`)
  }

  db.close()

  console.log('✨ Done!')
}

rebuildNormalizedNames()
