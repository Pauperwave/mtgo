/**
 * Integration test for DFC (Double-Faced Card) resolution
 * 
 * Tests that cards with "//" in their names (adventure cards, split cards, etc.)
 * are correctly resolved via the /api/cards/resolve endpoint.
 * 
 * Run with: node scripts/test-dfc-cards.mjs
 */

const API_URL = 'http://localhost:3001/api/cards/resolve'

const TEST_CASES = [
  {
    name: 'Adventure Card - Fang Dragon',
    inputName: 'Fang Dragon // Forktail Sweep',
    expectedFound: true,
    expectedCardName: 'Fang Dragon // Forktail Sweep',
    description: 'Adventure card should be found via front face lookup'
  },
  {
    name: 'Adventure Card - Sagu Wildling',
    inputName: 'Sagu Wildling // Roost Seek',
    expectedFound: true,
    expectedCardName: 'Sagu Wildling // Roost Seek',
    description: 'Another adventure card for verification'
  },
  {
    name: 'Normal Card - Lightning Bolt',
    inputName: 'Lightning Bolt',
    expectedFound: true,
    expectedCardName: 'Lightning Bolt',
    description: 'Regular card should still work'
  }
]

async function testCardResolution(testCase) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        names: [testCase.inputName]
      })
    })

    if (!response.ok) {
      console.error(`❌ ${testCase.name}: API error ${response.status}`)
      return false
    }

    const data = await response.json()
    
    // Check if card was found (in cards array, not in missing or fuzzySuggestions)
    const foundInCards = data.cards?.some(card => 
      card.name === testCase.expectedCardName
    )
    
    const foundInMissing = data.missing?.includes(testCase.inputName)
    const hasNameMapping = data.nameMappings?.[testCase.inputName] === testCase.expectedCardName

    if (testCase.expectedFound) {
      if (foundInCards && hasNameMapping && !foundInMissing) {
        console.log(`✅ ${testCase.name}: PASSED`)
        console.log(`   Input: "${testCase.inputName}"`)
        console.log(`   Found: "${data.cards.find(c => c.name === testCase.expectedCardName)?.name}"`)
        console.log(`   Name mapping: "${testCase.inputName}" → "${data.nameMappings[testCase.inputName]}"`)
        
        // Show performance stats
        if (data.performance) {
          console.log(`   Performance: DB hits=${data.performance.databaseHits}, Scryfall=${data.performance.scryfallRequests}`)
        }
        console.log()
        
        return true
      } else {
        console.error(`❌ ${testCase.name}: FAILED`)
        console.error(`   Expected card to be found in 'cards' array`)
        console.error(`   foundInCards: ${foundInCards}`)
        console.error(`   hasNameMapping: ${hasNameMapping}`)
        console.error(`   foundInMissing: ${foundInMissing}`)
        console.error(`   Response:`, JSON.stringify(data, null, 2))
        console.log()
        return false
      }
    } else {
      if (!foundInCards && foundInMissing) {
        console.log(`✅ ${testCase.name}: PASSED (correctly not found)`)
        console.log()
        return true
      } else {
        console.error(`❌ ${testCase.name}: FAILED (should not be found)`)
        console.log()
        return false
      }
    }
  } catch (error) {
    console.error(`❌ ${testCase.name}: Exception thrown`)
    console.error(`   Error:`, error.message)
    console.log()
    return false
  }
}

async function runAllTests() {
  console.log('🧪 Testing DFC Card Resolution')
  console.log('='.repeat(60))
  console.log()

  const results = []
  for (const testCase of TEST_CASES) {
    const result = await testCardResolution(testCase)
    results.push(result)
  }

  console.log('='.repeat(60))
  
  const passed = results.filter(r => r).length
  const total = results.length
  
  if (passed === total) {
    console.log(`✅ All tests passed! (${passed}/${total})`)
    process.exit(0)
  } else {
    console.error(`❌ Some tests failed (${passed}/${total} passed)`)
    process.exit(1)
  }
}

// Check if API is available before running tests
async function checkApiAvailable() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: ['Plains'] })
    })
    return response.ok
  } catch {
    return false
  }
}

async function main() {
  console.log('Checking if API is available at', API_URL)
  
  const isAvailable = await checkApiAvailable()
  
  if (!isAvailable) {
    console.error('❌ API is not available. Make sure the dev server is running:')
    console.error('   npm run dev')
    console.error()
    process.exit(1)
  }
  
  console.log('✅ API is available')
  console.log()
  
  await runAllTests()
}

main()
