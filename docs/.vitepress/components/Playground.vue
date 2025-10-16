<template>
  <div class="playground-container">
    <div class="playground-header">
      <h3>{{ title }}</h3>
      <div class="playground-controls">
        <button
          @click="runCode"
          class="run-button"
          :disabled="isRunning"
        >
          {{ isRunning ? '运行中...' : '运行代码' }}
        </button>
        <button
          @click="resetCode"
          class="reset-button"
        >
          重置
        </button>
        <button
          @click="copyCode"
          class="copy-button"
        >
          {{ copied ? '已复制!' : '复制' }}
        </button>
      </div>
    </div>

    <div class="playground-content">
      <div class="editor-section">
        <div class="editor-header">
          <span>代码编辑器</span>
          <select v-model="selectedExample" @change="loadExample" class="example-selector">
            <option v-for="(example, index) in examples" :key="index" :value="index">
              {{ example.name }}
            </option>
          </select>
        </div>
        <div class="editor-container">
          <textarea
            ref="codeEditor"
            v-model="code"
            class="code-editor"
            :placeholder="placeholder"
            @input="onCodeChange"
            spellcheck="false"
          ></textarea>
          <div class="line-numbers">
            <div
              v-for="line in lineCount"
              :key="line"
              class="line-number"
            >
              {{ line }}
            </div>
          </div>
        </div>
      </div>

      <div class="output-section">
        <div class="output-header">
          <span>输出结果</span>
          <button
            @click="clearOutput"
            class="clear-output-button"
          >
            清空
          </button>
        </div>
        <div class="output-container">
          <div v-if="output.length === 0" class="output-placeholder">
            运行代码后结果将显示在这里...
          </div>
          <div v-else class="output-content">
            <div
              v-for="(line, index) in output"
              :key="index"
              :class="['output-line', line.type]"
            >
              <span class="output-timestamp">{{ line.timestamp }}</span>
              <span class="output-text">{{ line.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-section">
      <div class="error-header">
        <span>⚠️ 错误信息</span>
        <button @click="clearError" class="clear-error-button">×</button>
      </div>
      <div class="error-content">{{ error }}</div>
    </div>

    <div v-if="showTips" class="tips-section">
      <h4>💡 使用提示</h4>
      <ul>
        <li>在左侧编辑器中修改代码</li>
        <li>点击"运行代码"执行代码</li>
        <li>右侧会显示运行结果和日志</li>
        <li>可以使用顶部的下拉菜单选择预设示例</li>
        <li>点击"复制"按钮可以复制当前代码</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'

interface PlaygroundExample {
  name: string
  code: string
  description?: string
}

interface OutputLine {
  text: string
  type: 'log' | 'error' | 'warn' | 'info'
  timestamp: string
}

interface Props {
  title?: string
  examples?: PlaygroundExample[]
  initialCode?: string
  placeholder?: string
  showTips?: boolean
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '交互式代码示例',
  examples: () => [],
  initialCode: '',
  placeholder: '在此输入您的代码...',
  showTips: true,
  height: '400px'
})

const codeEditor = ref<HTMLTextAreaElement>()
const code = ref(props.initialCode)
const output = ref<OutputLine[]>([])
const error = ref('')
const isRunning = ref(false)
const copied = ref(false)
const selectedExample = ref(0)

const lineCount = computed(() => {
  return code.value.split('\n').length
})

const loadExample = () => {
  const example = props.examples[selectedExample.value]
  if (example) {
    code.value = example.code
    clearOutput()
    clearError()
  }
}

const runCode = async () => {
  if (isRunning.value) return

  isRunning.value = true
  clearOutput()
  clearError()

  // 创建自定义console对象来捕获输出
  const customConsole = {
    log: (...args: any[]) => {
      addOutputLine(args.join(' '), 'log')
    },
    error: (...args: any[]) => {
      addOutputLine(args.join(' '), 'error')
    },
    warn: (...args: any[]) => {
      addOutputLine(args.join(' '), 'warn')
    },
    info: (...args: any[]) => {
      addOutputLine(args.join(' '), 'info')
    }
  }

  try {
    // 创建异步执行函数
    const asyncFunction = new Function(
      'console',
      'BluetoothPrinter',
      'setTimeout',
      'Promise',
      code.value
    )

    // 模拟BluetoothPrinter类（在实际使用中应该导入真实的类）
    const mockBluetoothPrinter = {
      getDevices: async () => [
        { deviceId: 'device_001', name: '模拟打印机1' },
        { deviceId: 'device_002', name: '模拟打印机2' }
      ],
      connect: async (deviceId: string) => {
        customConsole.log(`✅ 已连接到设备: ${deviceId}`)
        return true
      },
      printText: async (text: string, options?: any) => {
        customConsole.log(`📄 打印文本: ${text}`)
      },
      newLine: async () => {
        customConsole.log('📄 换行')
      },
      feedPaper: async (lines: number) => {
        customConsole.log(`📄 走纸 ${lines} 行`)
      },
      cutPaper: async () => {
        customConsole.log('✂️ 切纸')
      },
      disconnect: async () => {
        customConsole.log('🔌 已断开连接')
      }
    }

    // 执行代码
    await asyncFunction(
      customConsole,
      mockBluetoothPrinter,
      (fn: Function, delay: number) => {
        return new Promise(resolve => {
          setTimeout(() => resolve(fn()), delay)
        })
      },
      Promise
    )

    addOutputLine('✅ 代码执行完成', 'info')

  } catch (err: any) {
    error.value = err.message || '执行代码时发生未知错误'
    addOutputLine(`❌ 执行失败: ${error.value}`, 'error')
  } finally {
    isRunning.value = false
  }
}

const addOutputLine = (text: string, type: OutputLine['type']) => {
  const now = new Date()
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

  output.value.push({
    text,
    type,
    timestamp
  })

  // 自动滚动到底部
  nextTick(() => {
    const outputContainer = document.querySelector('.output-container')
    if (outputContainer) {
      outputContainer.scrollTop = outputContainer.scrollHeight
    }
  })
}

const resetCode = () => {
  if (props.examples.length > 0) {
    selectedExample.value = 0
    loadExample()
  } else {
    code.value = props.initialCode
  }
  clearOutput()
  clearError()
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = code.value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

const clearOutput = () => {
  output.value = []
}

const clearError = () => {
  error.value = ''
}

const onCodeChange = () => {
  // 同步滚动
  if (codeEditor.value) {
    const lineNumbers = document.querySelector('.line-numbers')
    if (lineNumbers) {
      lineNumbers.scrollTop = codeEditor.value.scrollTop
    }
  }
}

const syncScroll = () => {
  if (codeEditor.value) {
    const lineNumbers = document.querySelector('.line-numbers') as HTMLElement
    if (lineNumbers) {
      lineNumbers.scrollTop = codeEditor.value.scrollTop
    }
  }
}

onMounted(() => {
  if (codeEditor.value) {
    codeEditor.value.addEventListener('scroll', syncScroll)
  }

  // 加载第一个示例
  if (props.examples.length > 0) {
    loadExample()
  }
})
</script>

<style scoped>
.playground-container {
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  overflow: hidden;
  margin: 24px 0;
  background: var(--vp-c-bg);
}

.playground-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-border);
}

.playground-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.playground-controls {
  display: flex;
  gap: 8px;
}

.run-button,
.reset-button,
.copy-button {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.run-button:hover:not(:disabled) {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.run-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reset-button:hover {
  background: var(--vp-c-bg-mute);
}

.copy-button:hover {
  background: var(--vp-c-brand-2);
  color: white;
  border-color: var(--vp-c-brand-2);
}

.playground-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: v-bind(height);
}

.editor-section,
.output-section {
  display: flex;
  flex-direction: column;
}

.editor-section {
  border-right: 1px solid var(--vp-c-border);
}

.editor-header,
.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-border);
  font-size: 12px;
  font-weight: 500;
}

.example-selector {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 11px;
}

.editor-container {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.code-editor {
  width: 100%;
  height: 100%;
  padding: 16px 16px 16px 50px;
  border: none;
  outline: none;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  tab-size: 2;
}

.line-numbers {
  position: absolute;
  left: 0;
  top: 0;
  width: 40px;
  height: 100%;
  background: var(--vp-c-bg-soft);
  border-right: 1px solid var(--vp-c-border);
  padding: 16px 0;
  overflow: hidden;
  text-align: right;
  user-select: none;
}

.line-number {
  height: 20.8px;
  line-height: 1.6;
  font-size: 13px;
  color: var(--vp-c-text-2);
  padding-right: 8px;
}

.output-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.output-placeholder {
  color: var(--vp-c-text-2);
  font-style: italic;
  text-align: center;
  padding: 40px 0;
}

.output-line {
  margin-bottom: 4px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.output-timestamp {
  color: var(--vp-c-text-2);
  font-size: 10px;
  min-width: 50px;
}

.output-text {
  flex: 1;
}

.output-line.log .output-text {
  color: var(--vp-c-text-1);
}

.output-line.error .output-text {
  color: #ef4444;
}

.output-line.warn .output-text {
  color: #f59e0b;
}

.output-line.info .output-text {
  color: #3b82f6;
}

.clear-output-button,
.clear-error-button {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 11px;
}

.clear-output-button:hover {
  background: var(--vp-c-bg-mute);
}

.clear-error-button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-error-button:hover {
  color: var(--vp-c-text-1);
}

.error-section {
  border-top: 1px solid var(--vp-c-border);
  background: #fef2f2;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fee2e2;
  border-bottom: 1px solid #fecaca;
  font-size: 12px;
  font-weight: 500;
  color: #dc2626;
}

.error-content {
  padding: 16px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #dc2626;
  line-height: 1.5;
}

.tips-section {
  border-top: 1px solid var(--vp-c-border);
  padding: 16px 20px;
  background: var(--vp-c-bg-soft);
}

.tips-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--vp-c-brand-1);
}

.tips-section ul {
  margin: 0;
  padding-left: 20px;
}

.tips-section li {
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* Enhanced mobile responsive design */
@media (max-width: 768px) {
  .playground-container {
    margin: 16px 0;
    border-radius: 8px;
  }

  .playground-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 16px;
  }

  .playground-header h3 {
    font-size: 14px;
    margin: 0;
  }

  .playground-controls {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .run-button,
  .reset-button,
  .copy-button {
    flex: 1;
    min-width: 70px;
    padding: 8px 12px;
    font-size: 11px;
    border-radius: 6px;
  }

  .playground-content {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
    height: 500px;
    min-height: 400px;
  }

  .editor-section {
    border-right: none;
    border-bottom: 1px solid var(--vp-c-border);
  }

  .editor-header,
  .output-header {
    padding: 10px 12px;
    font-size: 11px;
  }

  .example-selector {
    padding: 3px 6px;
    font-size: 10px;
    min-width: 120px;
  }

  .code-editor {
    padding: 12px 12px 12px 35px;
    font-size: 11px;
    line-height: 1.4;
    tab-size: 2;
  }

  .line-numbers {
    width: 30px;
    padding: 12px 0;
  }

  .line-number {
    height: 15.4px;
    font-size: 10px;
    padding-right: 6px;
  }

  .output-container {
    padding: 12px;
    font-size: 10px;
    line-height: 1.4;
  }

  .output-line {
    margin-bottom: 3px;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .output-timestamp {
    font-size: 9px;
    opacity: 0.7;
    min-width: auto;
  }

  .clear-output-button,
  .clear-error-button {
    font-size: 10px;
    padding: 3px 6px;
  }

  .error-section {
    margin-top: 8px;
  }

  .error-header {
    padding: 8px 12px;
    font-size: 11px;
  }

  .error-content {
    padding: 12px;
    font-size: 10px;
    line-height: 1.4;
  }

  .tips-section {
    padding: 12px 16px;
  }

  .tips-section h4 {
    font-size: 12px;
    margin-bottom: 8px;
  }

  .tips-section li {
    font-size: 11px;
    margin-bottom: 3px;
  }
}

/* Small mobile devices */
@media (max-width: 480px) {
  .playground-container {
    margin: 12px 0;
    border-radius: 6px;
  }

  .playground-header {
    padding: 10px 12px;
  }

  .playground-controls {
    gap: 4px;
  }

  .run-button,
  .reset-button,
  .copy-button {
    padding: 6px 8px;
    font-size: 10px;
    min-width: 60px;
  }

  .playground-content {
    height: 450px;
    min-height: 350px;
  }

  .code-editor {
    padding: 10px 10px 10px 30px;
    font-size: 10px;
  }

  .line-numbers {
    width: 25px;
    padding: 10px 0;
  }

  .line-number {
    height: 14px;
    font-size: 9px;
    padding-right: 5px;
  }

  .output-container {
    padding: 10px;
    font-size: 9px;
  }

  .tips-section {
    padding: 10px 12px;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .run-button,
  .reset-button,
  .copy-button,
  .example-selector,
  .clear-output-button,
  .clear-error-button {
    min-height: 44px;
    padding: 10px 16px;
    font-size: 14px;
  }

  .code-editor {
    font-size: 14px;
    padding: 16px 16px 16px 45px;
  }

  .line-numbers {
    width: 40px;
  }

  .line-number {
    height: 21px;
    font-size: 13px;
    padding-right: 8px;
  }

  .output-container {
    font-size: 13px;
    padding: 16px;
  }

  .playground-header {
    padding: 16px 20px;
  }

  .playground-header h3 {
    font-size: 16px;
  }

  .example-selector {
    min-height: 44px;
    font-size: 14px;
    padding: 8px 12px;
  }
}

/* Landscape mobile orientation */
@media (max-width: 896px) and (orientation: landscape) {
  .playground-content {
    height: 350px;
    min-height: 300px;
  }

  .playground-header {
    flex-direction: row;
    gap: 16px;
    align-items: center;
    padding: 8px 16px;
  }

  .playground-controls {
    width: auto;
    flex-wrap: nowrap;
  }

  .tips-section {
    display: none; /* Hide tips in landscape to save space */
  }
}

/* Dark mode mobile optimizations */
html.dark .playground-container {
  border-color: var(--vp-c-border);
}

html.dark .code-editor {
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

html.dark .line-numbers {
  background-color: var(--vp-c-bg-soft);
}

html.dark .output-container {
  background-color: var(--vp-c-bg);
}

/* High contrast mode for accessibility */
@media (prefers-contrast: high) {
  .playground-container {
    border-width: 2px;
  }

  .run-button,
  .reset-button,
  .copy-button {
    border-width: 2px;
    font-weight: 600;
  }

  .code-editor {
    border: 1px solid var(--vp-c-text-1);
  }
}

/* 暗色主题适配 */
html.dark .error-section {
  background: #1f1f1f;
}

html.dark .error-header {
  background: #2d1f1f;
}

html.dark .error-content {
  color: #ef4444;
}
</style>