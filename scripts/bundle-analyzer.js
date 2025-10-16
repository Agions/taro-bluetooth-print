#!/usr/bin/env node

/**
 * Bundle size analysis script
 * Analyzes build outputs for bundle size optimization
 */

const fs = require('fs')
const path = require('path')

const DIST_DIR = path.resolve(__dirname, '../dist')

function analyzeBundleSize() {
  console.log('📦 Analyzing bundle sizes...')

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Dist directory does not exist. Run build first.')
    process.exit(1)
  }

  const files = fs.readdirSync(DIST_DIR)
  const results = []

  files.forEach(file => {
    const filePath = path.join(DIST_DIR, file)
    const stat = fs.statSync(filePath)

    if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.map'))) {
      const sizeKB = (stat.size / 1024).toFixed(2)
      const sizeMB = (stat.size / 1024 / 1024).toFixed(2)

      results.push({
        file,
        size: stat.size,
        sizeKB: parseFloat(sizeKB),
        sizeMB: parseFloat(sizeMB),
        type: file.endsWith('.map') ? 'source map' : 'bundle'
      })
    }
  })

  // Sort by size (largest first)
  results.sort((a, b) => b.size - a.size)

  console.log('\n📊 Bundle Size Analysis:')
  console.log('─'.repeat(60))
  console.log('File'.padEnd(30) + 'Type'.padEnd(12) + 'Size')
  console.log('─'.repeat(60))

  let totalBundleSize = 0
  let totalMapSize = 0

  results.forEach(result => {
    const sizeStr = result.sizeMB > 1
      ? `${result.sizeMB} MB`
      : `${result.sizeKB} KB`

    console.log(
      result.file.padEnd(30) +
      result.type.padEnd(12) +
      sizeStr
    )

    if (result.type === 'bundle') {
      totalBundleSize += result.size
    } else {
      totalMapSize += result.size
    }
  })

  console.log('─'.repeat(60))
  console.log(`Total Bundle Size: ${(totalBundleSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Total Source Map Size: ${(totalMapSize / 1024 / 1024).toFixed(2)} MB`)

  // Performance recommendations
  console.log('\n💡 Performance Recommendations:')

  if (totalBundleSize > 500 * 1024) { // > 500KB
    console.log('⚠️  Bundle size is large. Consider:')
    console.log('   - Code splitting for better tree-shaking')
    console.log('   - Removing unused dependencies')
    console.log('   - Minifying and compressing assets')
  } else {
    console.log('✅ Bundle size is within acceptable limits')
  }

  if (totalMapSize > totalBundleSize) {
    console.log('⚠️  Source maps are larger than bundles. Consider:')
    console.log('   - Generating source maps only for development')
    console.log('   - Using external source maps')
  }

  // Check for individual large files
  const largeFiles = results.filter(r => r.type === 'bundle' && r.sizeKB > 100)
  if (largeFiles.length > 0) {
    console.log('\n📋 Large Files (>100KB):')
    largeFiles.forEach(file => {
      console.log(`   - ${file.file}: ${file.sizeKB} KB`)
    })
  }

  return {
    totalBundleSize,
    totalMapSize,
    fileCount: results.length,
    recommendations: results.length > 0
  }
}

if (require.main === module) {
  analyzeBundleSize()
}

module.exports = { analyzeBundleSize }