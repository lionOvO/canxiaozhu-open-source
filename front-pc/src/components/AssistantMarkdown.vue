<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ content: string }>()
type Block = { kind: 'heading' | 'paragraph' | 'list' | 'code' | 'table'; lines: string[]; headers?: string[] }
const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
const blocks = computed(() => {
  const result: Block[] = []
  const lines = props.content.replace(/\r/g, '').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (!line.trim() || /^\s*([-*_])\1{2,}\s*$/.test(line)) continue
    if (line.startsWith('```')) {
      const code: string[] = []
      while (++i < lines.length && !lines[i]!.startsWith('```')) code.push(lines[i]!)
      result.push({ kind: 'code', lines: code }); continue
    }
    if (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? '')) {
      const rows: string[] = []
      const headers = cells(line)
      i += 2
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim()) rows.push(lines[i++]!)
      i--
      result.push({ kind: 'table', headers, lines: rows }); continue
    }
    const heading = line.match(/^#{1,6}\s+(.+)/)
    if (heading) { result.push({ kind: 'heading', lines: [heading[1]!] }); continue }
    if (/^\s*(?:[-*+]\s+|\d+[.)、]\s*)/.test(line)) {
      const items = [line.replace(/^\s*(?:[-*+]\s+|\d+[.)、]\s*)/, '')]
      while (/^\s*(?:[-*+]\s+|\d+[.)、]\s*)/.test(lines[i + 1] ?? ''))
        items.push(lines[++i]!.replace(/^\s*(?:[-*+]\s+|\d+[.)、]\s*)/, ''))
      result.push({ kind: 'list', lines: items }); continue
    }
    result.push({ kind: 'paragraph', lines: [line] })
  }
  return result
})

// Render source text through Vue interpolation; generated HTML is never executed.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[S\d+\])/g).filter(Boolean).map(value => ({
    kind: value.startsWith('**') ? 'strong' : value.startsWith('`') ? 'code' : /^\[S\d+\]$/.test(value) ? 'citation' : 'text',
    text: value.startsWith('**') ? value.slice(2, -2) : value.startsWith('`') ? value.slice(1, -1) : value,
  }))
}
</script>

<template>
  <div class="answer-body">
    <template v-for="(block, index) in blocks" :key="index">
      <div v-if="block.kind === 'table'" class="answer-table-wrap" tabindex="0" aria-label="回答数据表">
        <table>
          <thead><tr><th v-for="(cell, column) in block.headers" :key="column">{{ cell.replace(/\*\*/g, '') }}</th></tr></thead>
          <tbody><tr v-for="(row, rowIndex) in block.lines" :key="rowIndex"><td v-for="(cell, column) in cells(row)" :key="column">{{ cell.replace(/\*\*/g, '') }}</td></tr></tbody>
        </table>
      </div>
      <pre v-else-if="block.kind === 'code'"><code>{{ block.lines.join('\n') }}</code></pre>
      <ul v-else-if="block.kind === 'list'">
        <li v-for="(line, lineIndex) in block.lines" :key="lineIndex">
          <template v-for="(token, tokenIndex) in inline(line)" :key="tokenIndex"><strong v-if="token.kind === 'strong'">{{ token.text }}</strong><code v-else-if="token.kind === 'code'">{{ token.text }}</code><span v-else :class="{ 'citation-marker': token.kind === 'citation' }">{{ token.text }}</span></template>
        </li>
      </ul>
      <component :is="block.kind === 'heading' ? 'h4' : 'p'" v-else>
        <template v-for="(token, tokenIndex) in inline(block.lines[0] ?? '')" :key="tokenIndex"><strong v-if="token.kind === 'strong'">{{ token.text }}</strong><code v-else-if="token.kind === 'code'">{{ token.text }}</code><span v-else :class="{ 'citation-marker': token.kind === 'citation' }">{{ token.text }}</span></template>
      </component>
    </template>
  </div>
</template>

<style scoped>
.answer-body { color: var(--text-primary); font-size: 14px; line-height: 1.95; overflow-wrap: anywhere; }
.answer-body p { margin: 0 0 10px; white-space: pre-wrap; }
.answer-body h4 { color: var(--text-primary); font-size: 15px; margin: 22px 0 8px; }
.answer-body h4:first-child { margin-top: 0; }
.answer-body strong { font-weight: 700; color: var(--text-primary); }
.answer-body ul { padding-left: 21px; margin: 8px 0 16px; }
.answer-body li { padding-left: 3px; margin: 5px 0; }
.answer-body code { font-family: Consolas, monospace; font-size: 12px; background: var(--bg-muted); border-radius: 4px; padding: 2px 4px; }
.answer-body pre { background: var(--bg-muted); border-radius: 10px; padding: 14px; overflow: auto; }
.answer-body pre code { padding: 0; }
.answer-table-wrap { overflow-x: auto; margin: 14px 0 18px; border: 1px solid var(--line-soft); border-radius: 10px; }
table { border-collapse: collapse; width: 100%; font-size: 12px; white-space: nowrap; }
th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line-soft); }
th { background: var(--bg-accent); color: var(--text-secondary); font-weight: 600; }
tr:last-child td { border-bottom: 0; }
.citation-marker { color: var(--accent-primary-strong); font-size: 11px; font-weight: 700; background: var(--bg-accent); padding: 2px 4px; border-radius: 4px; }
</style>
