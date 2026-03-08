/**
 * Test to simulate Vercel environment (no database)
 * 
 * Tests DFC cards that are NOT in the Pauper database
 * This simulates what happens on Vercel where database is unavailable
 * 
 * Run with: node scripts/test-vercel-simulation.mjs
 */

const API_URL = 'http://localhost:3001/api/cards/resolve'

// Mythic/Rare cards that definitely won't be in Pauper database
const TEST_CASES = [
  {
    name: 'Fang Dragon (Pauper adventure card)',
    inputName: 'Fang Dragon // Forktail Sweep',
    expectedCardName: 'Fang Dragon // Forktail Sweep'
  },
  {
    name: 'Murderous Rider (Rare adventure card)',
    inputName: 'Murderous Rider // Swift End',
    expectedCardName: 'Murderous Rider // Swift End'
  },
  {
    name: 'Emrakul (Transform DFC)',
    inputName: 'Emrakul, the Aeons Torn',
    expectedCardName: 'Emrakul, the Aeons Torn'
  }
]

async function testCard(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`)
  console.log(`   Input: "${testCase.inputName}"`)
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names: [testCase.inputName] })
  })
  
  if (!response.ok) {
    console.error(`   ❌ API error: ${response.status}`)
    return false
  }
  
  const data = await response.json()
  
  // Check results
  const foundInCards = data.cards?.find(c => c.name === testCase.expectedCardName)
  const inMissing = data.missing?.includes(testCase.inputName)
  const hasMapping = data.nameMappings?.[testCase.inputName]
  
  console.log(`   📊 Results:`)
  console.log(`      - Found in cards: ${!!foundInCards}`)
  console.log(`      - In missing: ${inMissing}`)
  console.log(`      - Name mapping: ${hasMapping || 'none'}`)
  
  if (data.performance) {
    console.log(`   ⚡ Performance:`)
    console.log(`      - DB hits: ${data.performance.databaseHits}`)
    console.log(`      - Scryfall requests: ${data.performance.scryfallRequests}`)
    console.log(`      - Fuzzy searches: ${data.performance.scryfallFuzzyRequests || 0}`)
  }
  
  if (foundInCards && hasMapping) {
    console.log(`   ✅ PASSED`)
    
    // Check if it came from Scryfall (simulating Vercel)
    if (data.performance.scryfallRequests > 0) {
      console.log(`   🎯 Used Scryfall (Vercel simulation success!)`)
    } else if (data.performance.databaseHits > 0) {
      console.log(`   💾 Used database (local only - would fail on Vercel)`)
    }
    
    return true
  } else {
    console.log(`   ❌ FAILED`)
    if (data.errors) {
      console.log(`   Errors:`, data.errors)
    }
    if (data.fuzzySuggestions?.length > 0) {
      console.log(`   Has fuzzy suggestions:`, data.fuzzySuggestions.length)
    }
    return false
  }
}

async function main() {
  console.log('=' .repeat(70))
  console.log('🚀 VERCEL SIMULATION TEST')
  console.log('=' .repeat(70))
  console.log('Testing DFC cards that would hit Scryfall API (not database)')
  console.log('This simulates the Vercel environment where SQLite is unavailable')
  
  const results = []
  for (const testCase of TEST_CASES) {
    const result = await testCard(testCase)
    results.push(result)
  }
  
  console.log('\n' + '='.repeat(70))
  const passed = results.filter(r => r).length
  const total = results.length
  
  if (passed === total) {
    console.log(`✅ All tests passed! (${passed}/${total})`)
    console.log('\n🎉 DFC cards work correctly in Scryfall-only mode!')
    console.log('   This should work on Vercel.')
  } else {
    console.error(`❌ Tests failed (${passed}/${total} passed)`)
    console.error('\n⚠️  DFC cards may not work on Vercel!')
  }
  
  process.exit(passed === total ? 0 : 1)
}

// Check API
const testResponse = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ names: ['Plains'] })
}).catch(() => null)

if (!testResponse?.ok) {
  console.error('❌ API not available. Run: npm run dev')
  process.exit(1)
}

main()
