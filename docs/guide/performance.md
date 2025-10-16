# 性能优化指南

本指南详细介绍如何优化 Taro Bluetooth Print 库的性能，包括连接速度、打印效率、内存使用等方面的优化技巧。

## 性能分析

### 性能指标

在使用蓝牙打印功能时，需要关注以下性能指标：

- **连接建立时间**: 从开始连接到连接成功的时间
- **数据传输速度**: 每秒传输的数据量
- **打印响应时间**: 从发送命令到打印机响应的时间
- **内存占用**: 应用运行时的内存使用量
- **CPU 使用率**: 处理打印任务时的 CPU 占用
- **电池消耗**: 蓝牙操作对电池的影响

### 性能监控

```typescript
// 性能监控器
class PerformanceMonitor {
  private metrics = {
    connectionTime: [] as number[],
    transferSpeed: [] as number[],
    printTime: [] as number[],
    memoryUsage: [] as number[],
  }

  private startTime = 0

  // 开始监控
  startMonitoring(operation: string) {
    this.startTime = performance.now()
    console.log(`🚀 开始监控: ${operation}`)
  }

  // 结束监控
  endMonitoring(operation: string) {
    const endTime = performance.now()
    const duration = endTime - this.startTime

    console.log(`✅ ${operation} 完成，耗时: ${duration.toFixed(2)}ms`)

    // 记录指标
    switch (operation) {
      case "connection":
        this.metrics.connectionTime.push(duration)
        break
      case "print":
        this.metrics.printTime.push(duration)
        break
    }
  }

  // 记录传输速度
  recordTransferSpeed(dataSize: number, duration: number) {
    const speed = (dataSize / duration) * 1000 // bytes per second
    this.metrics.transferSpeed.push(speed)
    console.log(`📊 传输速度: ${(speed / 1024).toFixed(2)} KB/s`)
  }

  // 记录内存使用
  recordMemoryUsage() {
    if (typeof performance !== "undefined" && performance.memory) {
      const memory = performance.memory.usedJSHeapSize / 1024 / 1024 // MB
      this.metrics.memoryUsage.push(memory)
      console.log(`💾 内存使用: ${memory.toFixed(2)} MB`)
    }
  }

  // 获取性能报告
  getPerformanceReport() {
    const report = {
      averageConnectionTime: this.calculateAverage(this.metrics.connectionTime),
      averagePrintTime: this.calculateAverage(this.metrics.printTime),
      averageTransferSpeed: this.calculateAverage(this.metrics.transferSpeed),
      averageMemoryUsage: this.calculateAverage(this.metrics.memoryUsage),
    }

    console.table(report)
    return report
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }
}

// 使用性能监控
const performanceMonitor = new PerformanceMonitor()
```

## 连接优化

### 快速连接策略

```typescript
// 智能连接管理器
class SmartConnectionManager {
  private deviceCache = new Map<
    string,
    {
      device: any
      lastConnected: number
      connectionCount: number
    }
  >()

  private connectionPool = new Map<string, any>()

  // 优化连接参数
  private getOptimalConnectionOptions(deviceId: string) {
    const cached = this.deviceCache.get(deviceId)

    if (cached && cached.connectionCount > 3) {
      // 频繁连接的设备使用更快的参数
      return {
        timeout: 5000, // 减少超时时间
        autoReconnect: true, // 启用自动重连
        fastConnect: true, // 启用快速连接
      }
    }

    // 默认连接参数
    return {
      timeout: 10000,
      autoReconnect: false,
      fastConnect: false,
    }
  }

  // 智能连接
  async smartConnect(deviceId: string): Promise<boolean> {
    const options = this.getOptimalConnectionOptions(deviceId)

    performanceMonitor.startMonitoring("connection")

    try {
      // 检查连接池
      if (this.connectionPool.has(deviceId)) {
        const connection = this.connectionPool.get(deviceId)
        if (connection && connection.isConnected()) {
          console.log("🔄 使用连接池中的连接")
          return true
        }
      }

      // 执行连接
      const connected = await printer.bluetooth.connect(deviceId, options)

      if (connected) {
        // 更新缓存
        this.updateDeviceCache(deviceId)

        // 添加到连接池
        this.connectionPool.set(deviceId, printer.bluetooth)
      }

      performanceMonitor.endMonitoring("connection")
      return connected
    } catch (error) {
      performanceMonitor.endMonitoring("connection")
      throw error
    }
  }

  // 更新设备缓存
  private updateDeviceCache(deviceId: string) {
    const cached = this.deviceCache.get(deviceId)

    if (cached) {
      cached.lastConnected = Date.now()
      cached.connectionCount++
    } else {
      this.deviceCache.set(deviceId, {
        device: null,
        lastConnected: Date.now(),
        connectionCount: 1,
      })
    }
  }

  // 清理连接池
  cleanupConnectionPool() {
    for (const [deviceId, connection] of this.connectionPool) {
      if (!connection.isConnected()) {
        this.connectionPool.delete(deviceId)
      }
    }
  }
}

// 使用智能连接管理
const connectionManager = new SmartConnectionManager()
```

### 并行搜索优化

```typescript
// 并行设备搜索
class ParallelDeviceSearch {
  private searchPromises = new Map<string, Promise<any>>()

  // 并行搜索多种服务
  async parallelSearch(services: string[]): Promise<any[]> {
    console.log("🔍 开始并行搜索设备...")

    // 为每个服务创建搜索任务
    const searchTasks = services.map((service) => this.searchService(service))

    try {
      // 等待所有搜索完成
      const results = await Promise.allSettled(searchTasks)

      // 合并结果
      const allDevices = []
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          allDevices.push(...result.value)
        }
      })

      // 去重
      const uniqueDevices = this.deduplicateDevices(allDevices)

      console.log(`✅ 搜索完成，发现 ${uniqueDevices.length} 个设备`)
      return uniqueDevices
    } catch (error) {
      console.error("并行搜索失败:", error.message)
      return []
    }
  }

  // 搜索特定服务
  private async searchService(service: string): Promise<any[]> {
    try {
      await printer.bluetooth.startDiscovery({
        services: [service],
        timeout: 5000,
      })

      await new Promise((resolve) => setTimeout(resolve, 5000))

      return await printer.bluetooth.getDiscoveredDevices()
    } catch (error) {
      console.error(`搜索服务 ${service} 失败:`, error.message)
      return []
    }
  }

  // 设备去重
  private deduplicateDevices(devices: any[]): any[] {
    const seen = new Set()
    return devices.filter((device) => {
      if (seen.has(device.deviceId)) {
        return false
      }
      seen.add(device.deviceId)
      return true
    })
  }
}

// 使用并行搜索
const deviceSearch = new ParallelDeviceSearch()

async function optimizedDeviceSearch() {
  // 搜索常见的打印机服务
  const services = ["1812", "180F", "180A"]
  const devices = await deviceSearch.parallelSearch(services)

  if (devices.length > 0) {
    // 按信号强度排序
    devices.sort((a, b) => (b.RSSI || 0) - (a.RSSI || 0))

    // 连接信号最强的设备
    await connectionManager.smartConnect(devices[0].deviceId)
  }
}
```

## 数据传输优化

### 批量数据传输

```typescript
// 批量数据传输管理器
class BatchTransferManager {
  private batchSize = 512 // 每批数据大小 (bytes)
  private batchDelay = 50 // 批次间延迟 (ms)
  private maxConcurrentBatches = 3 // 最大并发批次数

  // 分批传输数据
  async transferInBatches(data: ArrayBuffer): Promise<boolean> {
    const chunks = this.splitData(data)
    const totalChunks = chunks.length

    console.log(`📦 开始批量传输，共 ${totalChunks} 个数据块`)

    try {
      // 使用并发控制
      await this.transferChunksWithConcurrency(chunks)

      console.log("✅ 批量传输完成")
      return true
    } catch (error) {
      console.error("批量传输失败:", error.message)
      return false
    }
  }

  // 分割数据
  private splitData(data: ArrayBuffer): ArrayBuffer[] {
    const chunks = []
    const totalLength = data.byteLength

    for (let offset = 0; offset < totalLength; offset += this.batchSize) {
      const chunkSize = Math.min(this.batchSize, totalLength - offset)
      const chunk = data.slice(offset, offset + chunkSize)
      chunks.push(chunk)
    }

    return chunks
  }

  // 并发传输数据块
  private async transferChunksWithConcurrency(chunks: ArrayBuffer[]) {
    const semaphore = new Semaphore(this.maxConcurrentBatches)
    const transferPromises = chunks.map(async (chunk, index) => {
      await semaphore.acquire()

      try {
        await this.transferChunk(chunk, index, chunks.length)
      } finally {
        semaphore.release()
      }
    })

    await Promise.all(transferPromises)
  }

  // 传输单个数据块
  private async transferChunk(
    chunk: ArrayBuffer,
    index: number,
    total: number
  ) {
    const startTime = performance.now()

    try {
      await printer.bluetooth.writeData(chunk)

      const duration = performance.now() - startTime
      performanceMonitor.recordTransferSpeed(chunk.byteLength, duration)

      console.log(
        `📤 传输进度: ${index + 1}/${total} (${(
          chunk.byteLength / 1024
        ).toFixed(2)} KB)`
      )

      // 添加延迟以避免缓冲区溢出
      if (index < total - 1) {
        await new Promise((resolve) => setTimeout(resolve, this.batchDelay))
      }
    } catch (error) {
      console.error(`数据块 ${index} 传输失败:`, error.message)
      throw error
    }
  }
}

// 信号量实现
class Semaphore {
  private permits: number
  private waitQueue: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--
        resolve()
      } else {
        this.waitQueue.push(resolve)
      }
    })
  }

  release(): void {
    this.permits++
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!
      resolve()
      this.permits--
    }
  }
}

// 使用批量传输
const batchTransfer = new BatchTransferManager()
```

### 数据压缩

```typescript
// 数据压缩工具
class DataCompressor {
  // 简单的 RLE 压缩算法
  compressRLE(data: Uint8Array): Uint8Array {
    const compressed = []
    let i = 0

    while (i < data.length) {
      const currentByte = data[i]
      let count = 1

      // 计算连续相同字节的数量
      while (
        i + count < data.length &&
        data[i + count] === currentByte &&
        count < 255
      ) {
        count++
      }

      // 如果连续字节数量大于 3，使用压缩
      if (count > 3) {
        compressed.push(0xff, currentByte, count)
      } else {
        // 否则直接存储原始数据
        for (let j = 0; j < count; j++) {
          compressed.push(currentByte)
        }
      }

      i += count
    }

    return new Uint8Array(compressed)
  }

  // RLE 解压缩
  decompressRLE(compressed: Uint8Array): Uint8Array {
    const decompressed = []
    let i = 0

    while (i < compressed.length) {
      if (compressed[i] === 0xff && i + 2 < compressed.length) {
        // 压缩数据
        const byte = compressed[i + 1]
        const count = compressed[i + 2]

        for (let j = 0; j < count; j++) {
          decompressed.push(byte)
        }

        i += 3
      } else {
        // 原始数据
        decompressed.push(compressed[i])
        i++
      }
    }

    return new Uint8Array(decompressed)
  }

  // 压缩图片数据
  async compressImageData(imageData: ArrayBuffer): Promise<ArrayBuffer> {
    const uint8Array = new Uint8Array(imageData)

    // 检查数据类型和选择压缩策略
    if (this.isBlackWhiteImage(uint8Array)) {
      // 黑白图像使用 RLE 压缩
      const compressed = this.compressRLE(uint8Array)
      console.log(
        `🗜️ 图片压缩率: ${(
          (1 - compressed.length / uint8Array.length) *
          100
        ).toFixed(1)}%`
      )
      return compressed.buffer
    }

    // 其他类型数据返回原始数据
    return imageData
  }

  // 检查是否为黑白图像
  private isBlackWhiteImage(data: Uint8Array): boolean {
    // 简单的黑白检测逻辑
    const uniqueBytes = new Set(data)
    return uniqueBytes.size <= 2
  }
}

// 使用数据压缩
const dataCompressor = new DataCompressor()

async function printCompressedImage(imageData: ArrayBuffer) {
  try {
    // 压缩图片数据
    const compressedData = await dataCompressor.compressImageData(imageData)

    // 传输压缩后的数据
    await batchTransfer.transferInBatches(compressedData)

    console.log("✅ 压缩图片打印完成")
  } catch (error) {
    console.error("压缩图片打印失败:", error.message)
  }
}
```

## 内存优化

### 内存池管理

```typescript
// 内存池管理器
class MemoryPool {
  private pools = new Map<number, ArrayBuffer[]>()
  private maxPoolSize = 10

  // 获取内存块
  getBuffer(size: number): ArrayBuffer {
    const pool = this.pools.get(size) || []

    if (pool.length > 0) {
      const buffer = pool.pop()!
      console.log(`🔄 从内存池获取 ${size} 字节缓冲区`)
      return buffer
    }

    console.log(`🆕 创建新的 ${size} 字节缓冲区`)
    return new ArrayBuffer(size)
  }

  // 归还内存块
  returnBuffer(buffer: ArrayBuffer) {
    const size = buffer.byteLength
    let pool = this.pools.get(size)

    if (!pool) {
      pool = []
      this.pools.set(size, pool)
    }

    if (pool.length < this.maxPoolSize) {
      // 清空缓冲区内容
      new Uint8Array(buffer).fill(0)
      pool.push(buffer)
      console.log(`💾 归还 ${size} 字节缓冲区到内存池`)
    } else {
      console.log(`🗑️ 内存池已满，丢弃 ${size} 字节缓冲区`)
    }
  }

  // 清理内存池
  cleanup() {
    this.pools.clear()
    console.log("🧹 内存池已清理")
  }

  // 获取内存池统计
  getStats() {
    const stats = {
      totalBuffers: 0,
      totalMemory: 0,
      pools: {} as Record<string, number>,
    }

    for (const [size, pool] of this.pools) {
      stats.pools[`${size}B`] = pool.length
      stats.totalBuffers += pool.length
      stats.totalMemory += pool.length * parseInt(size)
    }

    console.table(stats)
    return stats
  }
}

// 使用内存池
const memoryPool = new MemoryPool()

async function printWithMemoryPool(imageData: ArrayBuffer) {
  performanceMonitor.recordMemoryUsage()

  // 从内存池获取缓冲区
  const buffer = memoryPool.getBuffer(imageData.byteLength)

  try {
    // 复制数据到缓冲区
    new Uint8Array(buffer).set(new Uint8Array(imageData))

    // 打印数据
    await printer.bluetooth.writeData(buffer)
  } finally {
    // 归还缓冲区到内存池
    memoryPool.returnBuffer(buffer)
    performanceMonitor.recordMemoryUsage()
  }
}
```

### 图片处理优化

```typescript
// 优化的图片处理器
class OptimizedImageProcessor {
  private canvasPool: HTMLCanvasElement[] = []
  private maxCanvasPoolSize = 5

  // 获取 Canvas
  private getCanvas(): HTMLCanvasElement {
    if (this.canvasPool.length > 0) {
      return this.canvasPool.pop()!
    }

    return document.createElement("canvas")
  }

  // 归还 Canvas
  private returnCanvas(canvas: HTMLCanvasElement) {
    if (this.canvasPool.length < this.maxCanvasPoolSize) {
      // 清空 Canvas
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }

      this.canvasPool.push(canvas)
    }
  }

  // 优化的图片缩放
  async resizeImage(
    imagePath: string,
    maxWidth: number,
    maxHeight: number
  ): Promise<ArrayBuffer> {
    const canvas = this.getCanvas()
    const ctx = canvas.getContext("2d")!

    try {
      // 加载图片
      const img = new Image()
      img.src = imagePath

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      // 计算新尺寸
      const { width, height } = this.calculateDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      )

      // 设置 Canvas 尺寸
      canvas.width = width
      canvas.height = height

      // 使用高质量缩放
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      // 绘制缩放后的图片
      ctx.drawImage(img, 0, 0, width, height)

      // 转换为黑白图像
      const imageData = ctx.getImageData(0, 0, width, height)
      this.convertToBlackWhite(imageData)
      ctx.putImageData(imageData, 0, 0)

      // 转换为 ArrayBuffer
      return await this.canvasToArrayBuffer(canvas)
    } finally {
      this.returnCanvas(canvas)
    }
  }

  // 计算缩放尺寸
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth
    let height = originalHeight

    // 计算缩放比例
    const widthRatio = maxWidth / width
    const heightRatio = maxHeight / height
    const ratio = Math.min(widthRatio, heightRatio, 1)

    if (ratio < 1) {
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    return { width, height }
  }

  // 转换为黑白图像
  private convertToBlackWhite(imageData: ImageData): void {
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      // 计算灰度值
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114

      // 二值化
      const value = gray > 128 ? 255 : 0

      data[i] = value // R
      data[i + 1] = value // G
      data[i + 2] = value // B
      // Alpha 通道保持不变
    }
  }

  // Canvas 转 ArrayBuffer
  private async canvasToArrayBuffer(
    canvas: HTMLCanvasElement
  ): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          blob.arrayBuffer().then(resolve)
        } else {
          resolve(new ArrayBuffer(0))
        }
      }, "image/png")
    })
  }
}

// 使用优化的图片处理器
const imageProcessor = new OptimizedImageProcessor()

async function printOptimizedImage(imagePath: string) {
  try {
    // 优化图片处理
    const optimizedData = await imageProcessor.resizeImage(imagePath, 384, 400)

    // 压缩数据
    const compressedData = await dataCompressor.compressImageData(optimizedData)

    // 批量传输
    await batchTransfer.transferInBatches(compressedData)

    console.log("✅ 优化图片打印完成")
  } catch (error) {
    console.error("优化图片打印失败:", error.message)
  }
}
```

## 缓存优化

### 多级缓存系统

```typescript
// 多级缓存系统
class MultiLevelCache {
  private memoryCache = new Map<
    string,
    {
      data: any
      timestamp: number
      accessCount: number
    }
  >()

  private persistentCache = new Map<string, any>()
  private maxMemoryCacheSize = 50
  private cacheTimeout = 30 * 60 * 1000 // 30 分钟

  // 获取缓存数据
  async get(key: string): Promise<any> {
    // 检查内存缓存
    const memoryData = this.memoryCache.get(key)
    if (memoryData && !this.isExpired(memoryData.timestamp)) {
      memoryData.accessCount++
      console.log(`🎯 内存缓存命中: ${key}`)
      return memoryData.data
    }

    // 检查持久化缓存
    const persistentData = this.persistentCache.get(key)
    if (persistentData) {
      console.log(`💾 持久化缓存命中: ${key}`)

      // 加载到内存缓存
      this.setMemoryCache(key, persistentData)
      return persistentData
    }

    console.log(`❌ 缓存未命中: ${key}`)
    return null
  }

  // 设置缓存数据
  async set(key: string, data: any, persistent = false): Promise<void> {
    // 设置内存缓存
    this.setMemoryCache(key, data)

    // 设置持久化缓存
    if (persistent) {
      this.persistentCache.set(key, data)
      console.log(`💾 数据已保存到持久化缓存: ${key}`)
    }
  }

  // 设置内存缓存
  private setMemoryCache(key: string, data: any): void {
    // 检查缓存大小
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      this.evictLeastUsed()
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
    })
  }

  // 淘汰最少使用的数据
  private evictLeastUsed(): void {
    let leastUsedKey = ""
    let leastAccessCount = Infinity

    for (const [key, value] of this.memoryCache) {
      if (value.accessCount < leastAccessCount) {
        leastAccessCount = value.accessCount
        leastUsedKey = key
      }
    }

    if (leastUsedKey) {
      this.memoryCache.delete(leastUsedKey)
      console.log(`🗑️ 淘汰缓存: ${leastUsedKey}`)
    }
  }

  // 检查是否过期
  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.cacheTimeout
  }

  // 清理过期缓存
  cleanup(): void {
    for (const [key, value] of this.memoryCache) {
      if (this.isExpired(value.timestamp)) {
        this.memoryCache.delete(key)
        console.log(`🧹 清理过期缓存: ${key}`)
      }
    }
  }

  // 获取缓存统计
  getStats() {
    const stats = {
      memoryCacheSize: this.memoryCache.size,
      persistentCacheSize: this.persistentCache.size,
      hitRate: 0,
      memoryUsage: this.calculateMemoryUsage(),
    }

    console.table(stats)
    return stats
  }

  // 计算内存使用量
  private calculateMemoryUsage(): number {
    let totalSize = 0

    for (const [key, value] of this.memoryCache) {
      totalSize += key.length * 2 // 字符串大小
      totalSize += JSON.stringify(value.data).length * 2
      totalSize += 24 // 对象开销
    }

    return totalSize / 1024 // KB
  }
}

// 使用多级缓存
const cache = new MultiLevelCache()

async function printWithCache(imagePath: string) {
  const cacheKey = `image_${imagePath}`

  try {
    // 尝试从缓存获取
    let imageData = await cache.get(cacheKey)

    if (!imageData) {
      console.log("🔄 处理新图片...")

      // 处理图片
      imageData = await imageProcessor.resizeImage(imagePath, 384, 400)

      // 保存到缓存
      await cache.set(cacheKey, imageData, true)
    }

    // 打印图片
    await printer.bluetooth.writeData(imageData)
  } catch (error) {
    console.error("缓存打印失败:", error.message)
  }
}
```

## 打印队列优化

### 智能打印队列

```typescript
// 智能打印队列管理器
class SmartPrintQueue {
  private queue: Array<{
    id: string
    type: "text" | "image" | "command"
    data: any
    priority: number
    timestamp: number
    retryCount: number
  }> = []

  private isProcessing = false
  private maxRetries = 3
  private batchSize = 5
  private batchTimeout = 1000

  // 添加打印任务
  addTask(
    type: "text" | "image" | "command",
    data: any,
    priority = 0
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const taskId = `task_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`

      this.queue.push({
        id: taskId,
        type,
        data,
        priority,
        timestamp: Date.now(),
        retryCount: 0,
      })

      // 按优先级排序
      this.queue.sort((a, b) => b.priority - a.priority)

      // 监听任务完成
      this.waitForTaskCompletion(taskId, resolve, reject)

      // 开始处理队列
      this.processQueue()

      console.log(
        `📋 添加打印任务: ${taskId} (类型: ${type}, 优先级: ${priority})`
      )
    })
  }

  // 等待任务完成
  private waitForTaskCompletion(
    taskId: string,
    resolve: (value: string) => void,
    reject: (reason: any) => void
  ) {
    const checkInterval = setInterval(() => {
      const task = this.queue.find((t) => t.id === taskId)

      if (!task) {
        clearInterval(checkInterval)
        resolve(taskId)
      }
    }, 500)

    // 设置超时
    setTimeout(() => {
      clearInterval(checkInterval)
      reject(new Error("任务超时"))
    }, 30000)
  }

  // 处理队列
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true

    try {
      // 批量处理任务
      while (this.queue.length > 0) {
        const batch = this.queue.slice(0, this.batchSize)
        await this.processBatch(batch)

        // 移除已处理的任务
        this.queue = this.queue.slice(this.batchSize)

        // 如果还有任务，稍作延迟
        if (this.queue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.batchTimeout))
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  // 处理批次任务
  private async processBatch(batch: any[]) {
    console.log(`🔄 处理批次任务 (${batch.length} 个)`)

    for (const task of batch) {
      try {
        await this.executeTask(task)

        // 任务成功，从队列中移除
        const index = this.queue.findIndex((t) => t.id === task.id)
        if (index !== -1) {
          this.queue.splice(index, 1)
        }

        console.log(`✅ 任务完成: ${task.id}`)
      } catch (error) {
        console.error(`❌ 任务失败: ${task.id}`, error.message)

        task.retryCount++

        if (task.retryCount < this.maxRetries) {
          console.log(
            `🔄 重试任务: ${task.id} (${task.retryCount}/${this.maxRetries})`
          )

          // 降低优先级并重新排队
          task.priority = Math.max(0, task.priority - 1)

          // 延迟后重试
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * task.retryCount)
          )
        } else {
          console.error(`💀 任务最终失败: ${task.id}`)

          // 从队列中移除
          const index = this.queue.findIndex((t) => t.id === task.id)
          if (index !== -1) {
            this.queue.splice(index, 1)
          }
        }
      }
    }
  }

  // 执行单个任务
  private async executeTask(task: any): Promise<void> {
    switch (task.type) {
      case "text":
        await printer.printer.printText(task.data)
        break

      case "image":
        await printer.printer.printImage(task.data)
        break

      case "command":
        await printer.printer.sendCommands(task.data)
        break

      default:
        throw new Error(`未知任务类型: ${task.type}`)
    }
  }

  // 获取队列状态
  getQueueStatus() {
    const status = {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      tasksByType: {} as Record<string, number>,
      averagePriority: 0,
    }

    // 统计任务类型
    this.queue.forEach((task) => {
      status.tasksByType[task.type] = (status.tasksByType[task.type] || 0) + 1
    })

    // 计算平均优先级
    if (this.queue.length > 0) {
      const totalPriority = this.queue.reduce(
        (sum, task) => sum + task.priority,
        0
      )
      status.averagePriority = totalPriority / this.queue.length
    }

    console.table(status)
    return status
  }

  // 清空队列
  clearQueue() {
    this.queue = []
    console.log("🧹 打印队列已清空")
  }
}

// 使用智能打印队列
const printQueue = new SmartPrintQueue()

async function optimizedPrintExample() {
  try {
    // 添加多个打印任务
    const taskId1 = await printQueue.addTask("text", "=== 测试收据 ===", 10)
    const taskId2 = await printQueue.addTask("image", "/path/to/logo.png", 5)
    const taskId3 = await printQueue.addTask("text", "商品列表:", 3)
    const taskId4 = await printQueue.addTask("command", [0x1b, 0x61, 0x01], 1)

    console.log("所有任务已添加到队列")
  } catch (error) {
    console.error("队列打印失败:", error.message)
  }
}
```

## 性能监控与分析

### 性能分析工具

```typescript
// 性能分析工具
class PerformanceAnalyzer {
  private performanceData = {
    connections: [] as Array<{
      timestamp: number
      duration: number
      success: boolean
    }>,
    transfers: [] as Array<{
      timestamp: number
      size: number
      duration: number
    }>,
    prints: [] as Array<{
      timestamp: number
      type: string
      duration: number
      success: boolean
    }>,
    memory: [] as Array<{ timestamp: number; usage: number }>,
  }

  // 记录连接性能
  recordConnection(duration: number, success: boolean) {
    this.performanceData.connections.push({
      timestamp: Date.now(),
      duration,
      success,
    })
  }

  // 记录传输性能
  recordTransfer(size: number, duration: number) {
    this.performanceData.transfers.push({
      timestamp: Date.now(),
      size,
      duration,
    })
  }

  // 记录打印性能
  recordPrint(type: string, duration: number, success: boolean) {
    this.performanceData.prints.push({
      timestamp: Date.now(),
      type,
      duration,
      success,
    })
  }

  // 记录内存使用
  recordMemoryUsage(usage: number) {
    this.performanceData.memory.push({
      timestamp: Date.now(),
      usage,
    })
  }

  // 生成性能报告
  generateReport() {
    const report = {
      connection: this.analyzeConnections(),
      transfer: this.analyzeTransfers(),
      print: this.analyzePrints(),
      memory: this.analyzeMemory(),
      recommendations: this.generateRecommendations(),
    }

    console.log("📊 性能分析报告:")
    console.table(report)

    return report
  }

  // 分析连接性能
  private analyzeConnections() {
    const connections = this.performanceData.connections

    if (connections.length === 0) {
      return { count: 0, averageDuration: 0, successRate: 0 }
    }

    const successfulConnections = connections.filter((c) => c.success)
    const totalDuration = connections.reduce((sum, c) => sum + c.duration, 0)

    return {
      count: connections.length,
      averageDuration: totalDuration / connections.length,
      successRate: (successfulConnections.length / connections.length) * 100,
      fastestConnection: Math.min(...connections.map((c) => c.duration)),
      slowestConnection: Math.max(...connections.map((c) => c.duration)),
    }
  }

  // 分析传输性能
  private analyzeTransfers() {
    const transfers = this.performanceData.transfers

    if (transfers.length === 0) {
      return { count: 0, averageSpeed: 0, totalData: 0 }
    }

    const totalData = transfers.reduce((sum, t) => sum + t.size, 0)
    const totalTime = transfers.reduce((sum, t) => sum + t.duration, 0)
    const averageSpeed = (totalData / totalTime) * 1000 // bytes per second

    return {
      count: transfers.length,
      averageSpeed: averageSpeed / 1024, // KB/s
      totalData: totalData / 1024, // KB
      fastestTransfer:
        Math.max(...transfers.map((t) => (t.size / t.duration) * 1000)) / 1024, // KB/s
      slowestTransfer:
        Math.min(...transfers.map((t) => (t.size / t.duration) * 1000)) / 1024, // KB/s
    }
  }

  // 分析打印性能
  private analyzePrints() {
    const prints = this.performanceData.prints

    if (prints.length === 0) {
      return { count: 0, averageDuration: 0, successRate: 0 }
    }

    const successfulPrints = prints.filter((p) => p.success)
    const totalDuration = successfulPrints.reduce(
      (sum, p) => sum + p.duration,
      0
    )

    // 按类型分组
    const byType = prints.reduce((acc, print) => {
      if (!acc[print.type]) {
        acc[print.type] = { count: 0, successCount: 0, totalDuration: 0 }
      }
      acc[print.type].count++
      if (print.success) {
        acc[print.type].successCount++
        acc[print.type].totalDuration += print.duration
      }
      return acc
    }, {} as Record<string, any>)

    return {
      count: prints.length,
      averageDuration:
        successfulPrints.length > 0
          ? totalDuration / successfulPrints.length
          : 0,
      successRate: (successfulPrints.length / prints.length) * 100,
      byType,
    }
  }

  // 分析内存使用
  private analyzeMemory() {
    const memory = this.performanceData.memory

    if (memory.length === 0) {
      return { average: 0, peak: 0, trend: "stable" }
    }

    const average = memory.reduce((sum, m) => sum + m.usage, 0) / memory.length
    const peak = Math.max(...memory.map((m) => m.usage))

    // 分析趋势
    const recent = memory.slice(-10)
    const older = memory.slice(-20, -10)

    let trend = "stable"
    if (recent.length > 0 && older.length > 0) {
      const recentAvg =
        recent.reduce((sum, m) => sum + m.usage, 0) / recent.length
      const olderAvg = older.reduce((sum, m) => sum + m.usage, 0) / older.length

      if (recentAvg > olderAvg * 1.1) {
        trend = "increasing"
      } else if (recentAvg < olderAvg * 0.9) {
        trend = "decreasing"
      }
    }

    return {
      average,
      peak,
      trend,
    }
  }

  // 生成优化建议
  private generateRecommendations() {
    const recommendations = []

    const connectionAnalysis = this.analyzeConnections()
    const transferAnalysis = this.analyzeTransfers()
    const memoryAnalysis = this.analyzeMemory()

    // 连接优化建议
    if (connectionAnalysis.successRate < 90) {
      recommendations.push("连接成功率较低，建议检查蓝牙信号强度或增加重试次数")
    }

    if (connectionAnalysis.averageDuration > 10000) {
      recommendations.push("连接时间较长，建议优化连接参数或使用连接池")
    }

    // 传输优化建议
    if (transferAnalysis.averageSpeed < 10) {
      recommendations.push("传输速度较慢，建议启用数据压缩或增加批次大小")
    }

    // 内存优化建议
    if (memoryAnalysis.trend === "increasing") {
      recommendations.push(
        "内存使用呈上升趋势，建议检查内存泄漏或增加缓存清理频率"
      )
    }

    if (memoryAnalysis.peak > 50) {
      recommendations.push("内存峰值较高，建议优化图片处理或减少缓存大小")
    }

    return recommendations
  }
}

// 使用性能分析器
const performanceAnalyzer = new PerformanceAnalyzer()

// 定期生成性能报告
setInterval(() => {
  performanceAnalyzer.generateReport()
}, 60000) // 每分钟生成一次报告
```

## 最佳实践

### 1. 预加载和预热

```typescript
// 预加载管理器
class PreloadManager {
  private preloadedData = new Map<string, any>()

  // 预加载常用图片
  async preloadCommonImages() {
    const commonImages = [
      "/images/logo.png",
      "/images/qr-code.png",
      "/images/header.png",
    ]

    console.log("🔄 预加载常用图片...")

    const preloadPromises = commonImages.map(async (imagePath) => {
      try {
        const processedImage = await imageProcessor.resizeImage(
          imagePath,
          384,
          200
        )
        this.preloadedData.set(imagePath, processedImage)
        console.log(`✅ 预加载完成: ${imagePath}`)
      } catch (error) {
        console.error(`❌ 预加载失败: ${imagePath}`, error.message)
      }
    })

    await Promise.allSettled(preloadPromises)
  }

  // 获取预加载数据
  getPreloadedData(key: string) {
    return this.preloadedData.get(key)
  }

  // 预热蓝牙连接
  async warmupBluetooth() {
    try {
      console.log("🔥 预热蓝牙连接...")

      // 初始化蓝牙适配器
      await printer.bluetooth.init()

      // 短暂搜索设备
      await printer.bluetooth.startDiscovery({ timeout: 2000 })

      console.log("✅ 蓝牙预热完成")
    } catch (error) {
      console.error("❌ 蓝牙预热失败:", error.message)
    }
  }
}

// 使用预加载
const preloadManager = new PreloadManager()

// 应用启动时预加载
preloadManager.preloadCommonImages()
preloadManager.warmupBluetooth()
```

### 2. 渐进式优化

```typescript
// 渐进式优化管理器
class ProgressiveOptimizer {
  private optimizationLevel = 1
  private performanceThresholds = {
    connectionTime: 5000,
    transferSpeed: 20, // KB/s
    memoryUsage: 30, // MB
  }

  // 根据性能调整优化级别
  adjustOptimizationLevel(performanceData: any) {
    const { connection, transfer, memory } = performanceData

    // 如果性能良好，降低优化级别
    if (
      connection.averageDuration < this.performanceThresholds.connectionTime &&
      transfer.averageSpeed > this.performanceThresholds.transferSpeed &&
      memory.average < this.performanceThresholds.memoryUsage
    ) {
      this.optimizationLevel = Math.max(1, this.optimizationLevel - 1)
      console.log(`⬇️ 降低优化级别到: ${this.optimizationLevel}`)
    }

    // 如果性能较差，提高优化级别
    if (
      connection.averageDuration >
        this.performanceThresholds.connectionTime * 2 ||
      transfer.averageSpeed < this.performanceThresholds.transferSpeed / 2 ||
      memory.average > this.performanceThresholds.memoryUsage * 2
    ) {
      this.optimizationLevel = Math.min(5, this.optimizationLevel + 1)
      console.log(`⬆️ 提高优化级别到: ${this.optimizationLevel}`)
    }
  }

  // 获取当前优化配置
  getOptimizationConfig() {
    const configs = {
      1: {
        batchSize: 512,
        batchDelay: 50,
        compressionEnabled: false,
        cacheEnabled: true,
      },
      2: {
        batchSize: 256,
        batchDelay: 30,
        compressionEnabled: true,
        cacheEnabled: true,
      },
      3: {
        batchSize: 128,
        batchDelay: 20,
        compressionEnabled: true,
        cacheEnabled: true,
      },
      4: {
        batchSize: 64,
        batchDelay: 10,
        compressionEnabled: true,
        cacheEnabled: false,
      },
      5: {
        batchSize: 32,
        batchDelay: 5,
        compressionEnabled: true,
        cacheEnabled: false,
      },
    }

    return configs[this.optimizationLevel] || configs[1]
  }
}

// 使用渐进式优化
const progressiveOptimizer = new ProgressiveOptimizer()
```

## 下一步

学习了性能优化后，您可以继续探索：

- [API 文档](/api/) - 查看完整的 API 参考
- [示例代码](/examples/) - 查看实际使用案例
- [常见问题](/reference/faq) - 查看更多常见问题解答
- [贡献指南](/reference/contributing) - 了解如何贡献代码
