#!/usr/bin/env node

/**
 * Build performance monitoring script
 * Monitors build times, resource usage, and performance metrics
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function measureBuildPerformance() {
  console.log('⚡ Measuring build performance...')

  const results = {
    startTime: Date.now(),
    endTime: null,
    duration: null,
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  }

  try {
    // Clean previous build
    console.log('🧹 Cleaning previous build...')
    execSync('npm run clean', { stdio: 'inherit' })

    // Measure build time
    console.log('🔨 Starting build...')
    const buildStart = Date.now()

    execSync('npm run build', { stdio: 'inherit' })

    const buildEnd = Date.now()
    results.endTime = buildEnd
    results.duration = buildEnd - buildStart

    // Memory usage after build
    results.memoryUsageAfter = process.memoryUsage()

    // Analyze build outputs
    const distDir = path.resolve(__dirname, '../dist')
    if (fs.existsSync(distDir)) {
      results.outputs = analyzeBuildOutputs(distDir)
    }

    // Generate performance report
    generatePerformanceReport(results)

    return results
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    results.error = error.message
    return results
  }
}

function analyzeBuildOutputs(distDir) {
  const outputs = {
    files: [],
    totalSize: 0,
    formats: { es: false, cjs: false, umd: false, types: false }
  }

  const files = fs.readdirSync(distDir)
  files.forEach(file => {
    const filePath = path.join(distDir, file)
    const stat = fs.statSync(filePath)

    if (stat.isFile()) {
      const fileInfo = {
        name: file,
        size: stat.size,
        sizeKB: (stat.size / 1024).toFixed(2),
        type: getFileType(file)
      }

      outputs.files.push(fileInfo)
      outputs.totalSize += stat.size

      // Detect formats
      if (file.includes('.es.')) outputs.formats.es = true
      if (file.includes('.cjs.')) outputs.formats.cjs = true
      if (file.includes('.umd.')) outputs.formats.umd = true
      if (file.includes('.d.ts')) outputs.formats.types = true
    }
  })

  return outputs
}

function getFileType(filename) {
  if (filename.endsWith('.map')) return 'source map'
  if (filename.endsWith('.d.ts')) return 'declaration'
  if (filename.includes('.es.')) return 'es module'
  if (filename.includes('.cjs.')) return 'commonjs'
  if (filename.includes('.umd.')) return 'umd'
  return 'unknown'
}

function generatePerformanceReport(results) {
  console.log('\n📊 Build Performance Report')
  console.log('='.repeat(50))

  if (results.error) {
    console.log('❌ Build Status: FAILED')
    console.log(`Error: ${results.error}`)
    return
  }

  console.log('✅ Build Status: SUCCESS')
  console.log(`⏱️  Build Duration: ${results.duration}ms (${(results.duration / 1000).toFixed(2)}s)`)
  console.log(`📦 Total Bundle Size: ${(results.outputs.totalSize / 1024 / 1024).toFixed(2)} MB`)

  console.log('\n🔍 Format Coverage:')
  Object.entries(results.outputs.formats).forEach(([format, exists]) => {
    console.log(`   ${format.toUpperCase()}: ${exists ? '✅' : '❌'}`)
  })

  console.log('\n💾 Memory Usage:')
  const memBefore = results.memoryUsage
  const memAfter = results.memoryUsageAfter

  console.log(`   RSS: ${(memAfter.rss / 1024 / 1024).toFixed(2)} MB (+${((memAfter.rss - memBefore.rss) / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`   Heap Used: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`)
  console.log(`   External: ${(memAfter.external / 1024 / 1024).toFixed(2)} MB`)

  console.log('\n🔧 Environment:')
  console.log(`   Node.js: ${results.nodeVersion}`)
  console.log(`   Platform: ${results.platform} (${results.arch})`)

  // Performance recommendations
  console.log('\n💡 Performance Insights:')

  if (results.duration > 30000) {
    console.log('⚠️  Build is slow (>30s). Consider optimizing dependencies or build configuration.')
  } else if (results.duration < 5000) {
    console.log('✅ Build is fast (<5s). Great performance!')
  }

  if (results.outputs.totalSize > 1024 * 1024) { // > 1MB
    console.log('⚠️  Bundle size is large. Review dependencies and tree-shaking.')
  }

  const memIncrease = (memAfter.rss - memBefore.rss) / 1024 / 1024
  if (memIncrease > 500) { // > 500MB increase
    console.log('⚠️  High memory usage during build. Monitor for memory leaks.')
  }

  // Save report to file
  const reportPath = path.resolve(__dirname, '../dist/build-performance.json')
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
}

if (require.main === module) {
  measureBuildPerformance()
}

module.exports = { measureBuildPerformance }