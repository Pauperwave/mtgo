/**
 * Test script for card database and API functionality
 * Run with: bun run scripts/test-database.ts
 */

import { 
  getCardByName, 
  getCardByNormalizedName,
  getCardsByNormalizedNames,
  getPauperCardsCount
} from '../server/utils/card-database'

console.log('🧪 Testing MTGO Card Database\n')

async function testDatabase() {
  try {
    // Test 1: Database stats
    console.log('📊 Test 1: Database Stats')
    const count = await getPauperCardsCount()
    console.log(`   ✅ Total cards: ${count}`)
    console.log(`   Expected: 10,573 (or close)\n`)

    // Test 2: Exact name lookup
    console.log('🔍 Test 2: Exact Name Lookup')
    const ponder = await getCardByName('Ponder')
    console.log(`   ${ponder ? '✅' : '❌'} Found: ${ponder?.name}`)
    console.log(`   Type: ${ponder?.type_line}\n`)

    // Test 3: Case-insensitive lookup
    console.log('🔍 Test 3: Case-Insensitive Lookup')
    const testCases = [
      'delver of secrets',      // lowercase
      'PONDER',                 // uppercase
      'Lorien Revealed',        // missing diacritic (ó)
      'Troll of khazad dum',    // missing diacritic (û) and hyphen
    ]

    for (const name of testCases) {
      const card = await getCardByNormalizedName(name)
      if (card) {
        console.log(`   ✅ "${name}" → "${card.name}"`)
      } else {
        console.log(`   ❌ "${name}" → NOT FOUND`)
      }
    }
    console.log()

    // Test 4: Batch lookup
    console.log('🔍 Test 4: Batch Normalized Lookup')
    const batchNames = [
      'delver of secrets',
      'ponder',
      'Lorien Revealed',
      'brainstorm',
      'counterspell'
    ]
    
    const batchResults = await getCardsByNormalizedNames(batchNames)
    console.log(`   Requested: ${batchNames.length} cards`)
    console.log(`   Found: ${batchResults.size} cards`)
    
    for (const [input, card] of batchResults.entries()) {
      console.log(`   ✅ "${input}" → "${card.name}"`)
    }
    
    const missing = batchNames.filter(name => !batchResults.has(name))
    if (missing.length > 0) {
      console.log(`   ❌ Missing: ${missing.join(', ')}`)
    }
    console.log()

    // Test 5: DFC (Double-Faced Card) lookup
    console.log('🔍 Test 5: Double-Faced Cards')
    const dfcTests = [
      'Tithing Blade',
      'The Modern Age'
    ]
    
    for (const name of dfcTests) {
      const card = await getCardByNormalizedName(name)
      if (card) {
        console.log(`   ✅ "${name}" → "${card.name}"`)
        if (card.card_faces) {
          const faces = JSON.parse(card.card_faces)
          console.log(`      Faces: ${faces.map((f: any) => f.name).join(' // ')}`)
        }
      } else {
        console.log(`   ❌ "${name}" → NOT FOUND`)
      }
    }
    console.log()

    console.log('✨ All tests complete!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testDatabase()
