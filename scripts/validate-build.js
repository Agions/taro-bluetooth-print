#!/usr/bin/env node

/**
 * Build validation script
 * Validates that the build outputs are correct and complete
 */

const fs = require('fs')
const path = require('path')

const DIST_DIR = path.resolve(__dirname, '../dist')
const EXPECTED_FILES = [
  'index.es.js',
  'index.cjs.js',
  'index.umd.js',
  'index.es.js.map',
  'index.cjs.js.map',
  'index.umd.js.map'
]

function validateBuild() {
  console.log('🔍 Validating build outputs...')

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Dist directory does not exist')
    process.exit(1)
  }

  const missingFiles = []
  const existingFiles = []

  EXPECTED_FILES.forEach(file => {
    const filePath = path.join(DIST_DIR, file)
    if (fs.existsSync(filePath)) {
      existingFiles.push(file)
      console.log(`✅ ${file}`)
    } else {
      missingFiles.push(file)
      console.log(`❌ ${file} - missing`)
    }
  })

  // Check for TypeScript declarations
  const typesDir = path.join(DIST_DIR, 'types')
  if (fs.existsSync(typesDir)) {
    console.log('✅ TypeScript declarations generated')
  } else {
    missingFiles.push('types/**')
    console.log('❌ TypeScript declarations missing')
  }

  if (missingFiles.length > 0) {
    console.error(`\n❌ Build validation failed. Missing ${missingFiles.length} files:`)
    missingFiles.forEach(file => console.error(`   - ${file}`))
    process.exit(1)
  }

  console.log(`\n✅ Build validation passed! All ${existingFiles.length} files found.`)
}

if (require.main === module) {
  validateBuild()
}

module.exports = { validateBuild }