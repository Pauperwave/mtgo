// Test script for fuzzy suggestion behavior
import fetch from 'node-fetch'

const deckList = `4 Quirion Ranger
4 Lightning Bolt
4 Llanower Elfs`

// Parse the deck list to extract card names
function parseDeckList(text) {
  const lines = text.trim().split('\n')
  const cardNames = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.toLowerCase() === 'sideboard') continue
    
    // Match pattern: "number cardname" or just "cardname"
    const match = trimmed.match(/^(\d+)?\s*(.+)$/)
    if (match) {
      const cardName = match[2].trim()
      if (cardName) {
        cardNames.push(cardName)
      }
    }
  }
  
  return cardNames
}

async function testFuzzyBehavior() {
  console.log('='.repeat(80))
  console.log('Testing Fuzzy Suggestion Behavior')
  console.log('='.repeat(80))
  console.log()
  
  const cardNames = parseDeckList(deckList)
  console.log(`Testing with ${cardNames.length} card names:`)
  cardNames.forEach((name, i) => console.log(`  ${i + 1}. ${name}`))
  console.log()
  
  // Test via API endpoint
  console.log('Calling /api/cards/resolve endpoint...')
  const response = await fetch('http://localhost:3000/api/cards/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names: cardNames })
  })
  
  if (!response.ok) {
    console.error('API Error:', response.status, response.statusText)
    const text = await response.text()
    console.error('Response:', text)
    return
  }
  
  const data = await response.json()
  
  console.log()
  console.log('='.repeat(80))
  console.log('API Response Summary')
  console.log('='.repeat(80))
  console.log(`Total cards found: ${data.cards?.length || 0}`)
  console.log(`Missing cards: ${data.missing?.length || 0}`)
  console.log(`Fuzzy suggestions: ${data.fuzzySuggestions?.length || 0}`)
  console.log()
  
  if (data.cards && data.cards.length > 0) {
    console.log('✅ Cards Found (Exact/Auto-Accepted):')
    data.cards.forEach(card => console.log(`  - ${card.name}`))
    console.log()
  }
  
  if (data.fuzzySuggestions && data.fuzzySuggestions.length > 0) {
    console.log('🔍 Fuzzy Suggestions (Require Confirmation):')
    data.fuzzySuggestions.forEach(fs => {
      console.log(`  "${fs.searchedName}" → ${fs.suggestions.length} suggestion(s):`)
      fs.suggestions.forEach((s, i) => {
        console.log(`    ${i + 1}. ${s.card.name} (similarity: ${s.similarity.toFixed(2)}, distance: ${s.distance})`)
      })
    })
    console.log()
  }
  
  if (data.missing && data.missing.length > 0) {
    console.log('❌ Missing Cards (No Matches Found):')
    data.missing.forEach(name => console.log(`  - ${name}`))
    console.log()
  }
  
  // Name mappings
  if (data.nameMappings && Object.keys(data.nameMappings).length > 0) {
    console.log('🗺️  Name Mappings:')
    Object.entries(data.nameMappings).forEach(([input, output]) => {
      console.log(`  "${input}" → "${output}"`)
    })
    console.log()
  }
  
  // Performance stats
  if (data.performance) {
    console.log('='.repeat(80))
    console.log('Performance Stats:')
    console.log('='.repeat(80))
    console.log(`Total requests: ${data.performance.totalRequests}`)
    console.log(`Database hits: ${data.performance.databaseHits}`)
    console.log(`Scryfall batch requests: ${data.performance.scryfallBatchRequests || 0}`)
    console.log(`Scryfall fuzzy requests: ${data.performance.scryfallFuzzyRequests || 0}`)
    console.log(`Processing time: ${data.performance.processingTimeMs}ms`)
    console.log()
  }
  
  // Final verdict
  console.log('='.repeat(80))
  console.log('Test Expectations:')
  console.log('='.repeat(80))
  console.log('Expected behavior:')
  console.log('  1. "Quirion Ranger" → found in cards (exact match)')
  console.log('  2. "Lightning Bolt" → found in cards (exact match)')
  console.log('  3. "Llanower Elfs" → has fuzzy suggestions, NOT in missing')
  console.log()
  console.log('Actual behavior:')
  
  const quirionInCards = data.cards?.find(c => c.name.includes('Quirion'))
  const boltInCards = data.cards?.find(c => c.name.includes('Lightning'))
  const llanowarHasSuggestions = data.fuzzySuggestions?.find(fs => fs.searchedName === 'Llanower Elfs')
  const llanowarInMissing = data.missing?.includes('Llanower Elfs')
  
  console.log(`  1. Quirion Ranger: ${quirionInCards ? '✅ Found in cards' : '❌ NOT in cards'}`)
  console.log(`  2. Lightning Bolt: ${boltInCards ? '✅ Found in cards' : '❌ NOT in cards'}`)
  console.log(`  3. Llanower Elfs: ${llanowarHasSuggestions ? '✅ Has fuzzy suggestions' : '❌ No fuzzy suggestions'}`)
  console.log(`                    ${llanowarInMissing ? '❌ In missing array (WRONG!)' : '✅ NOT in missing array'}`)
  console.log()
  
  const success = quirionInCards && boltInCards && llanowarHasSuggestions && !llanowarInMissing
  
  if (success) {
    console.log('🎉 SUCCESS: All expectations met!')
  } else {
    console.log('⚠️  FAILED: Some expectations not met')
  }
  console.log()
}

testFuzzyBehavior().catch(console.error)
