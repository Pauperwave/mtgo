// Test script for user's 27-card deck list
import fetch from 'node-fetch'

const deckList = `2 Bojuka Bog
3 Campfire
4 Cast Down
3 Crypt Rats
4 Defile
4 Eviscerator's Insight
4 Fanatical Offering
1 Golgari Rot Farm
1 Haunted Mire
3 Ichor Wellspring
2 Kami of Jealous Thirst
4 Khalni Garden
1 Lantern of Undersight
3 Lembas
2 Nihil Spellbomb
2 Snuff Out
10 Swamp
2 Thorn of the Black Rose
3 Tithing Blade
3 Troll of Khazad-dum
1 Witch's Cottage`

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

async function testDeck() {
  console.log('='.repeat(80))
  console.log('Testing User\'s 27-Card Deck List')
  console.log('='.repeat(80))
  console.log()
  
  const cardNames = parseDeckList(deckList)
  console.log(`Parsed ${cardNames.length} unique card names from deck list:`)
  cardNames.forEach((name, i) => console.log(`  ${i + 1}. ${name}`))
  console.log()
  
  // Check if Troll is in the list
  const trollName = cardNames.find(name => name.includes('Troll'))
  console.log(`Found Troll card: "${trollName}"`)
  console.log(`Troll name bytes: ${Buffer.from(trollName).toString('hex')}`)
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
  
  if (data.missing && data.missing.length > 0) {
    console.log('Missing Cards:')
    data.missing.forEach(name => console.log(`  ✗ ${name}`))
    console.log()
  }
  
  if (data.fuzzySuggestions && data.fuzzySuggestions.length > 0) {
    console.log('Fuzzy Suggestions:')
    data.fuzzySuggestions.forEach(fs => {
      console.log(`  ? "${fs.searchedName}" -> ${fs.suggestions.length} suggestions:`)
      fs.suggestions.forEach((s, i) => {
        console.log(`    ${i + 1}. ${s.card.name} (similarity: ${s.similarity.toFixed(2)})`)
      })
    })
    console.log()
  }
  
  // Check specifically for Troll
  const trollInCards = data.cards?.find(c => c.name.includes('Troll'))
  const trollInMissing = data.missing?.find(n => n.includes('Troll'))
  const trollInSuggestions = data.fuzzySuggestions?.find(fs => fs.searchedName.includes('Troll'))
  
  console.log('='.repeat(80))
  console.log('Troll Card Status:')
  console.log('='.repeat(80))
  if (trollInCards) {
    console.log(`✓ Found in cards array: "${trollInCards.name}"`)
    console.log(`  Card name bytes: ${Buffer.from(trollInCards.name).toString('hex')}`)
  }
  if (trollInMissing) {
    console.log(`✗ Found in missing array: "${trollInMissing}"`)
  }
  if (trollInSuggestions) {
    console.log(`? Found in suggestions:`)
    trollInSuggestions.suggestions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.card.name} (similarity: ${s.similarity.toFixed(2)})`)
    })
  }
  if (!trollInCards && !trollInMissing && !trollInSuggestions) {
    console.log('⚠ Troll card not found anywhere in response!')
  }
  console.log()
  
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
  console.log('Test Result:')
  console.log('='.repeat(80))
  if (data.cards?.length === 27 && data.missing?.length === 0) {
    console.log('✅ SUCCESS: All 27 cards resolved correctly!')
    console.log('✅ Troll of Khazad-dum was auto-normalized to Troll of Khazad-dûm')
  } else {
    console.log('❌ FAILED: Some cards were not resolved')
    console.log(`   Expected: 27 cards, 0 missing`)
    console.log(`   Got: ${data.cards?.length || 0} cards, ${data.missing?.length || 0} missing`)
  }
  console.log()
}

testDeck().catch(console.error)
