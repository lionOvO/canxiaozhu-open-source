// Uses the configured model and read-only business tools. Run manually.
import { runBusinessAgent } from '../src/services/business-agent.js'
import { MerchantService } from '../src/services/merchant-service.js'
import { prisma } from '../src/lib/prisma.js'
try {
  for await (const event of runBusinessAgent(new MerchantService(), 3001,
    '请调用采购试算工具，说明明天采购建议及数据不足之处，不要执行采购。')) {
    if (event.type === 'tool_start' || event.type === 'tool_end') console.log(event.type, event.name)
    if (event.type === 'complete') console.log('COMPLETE', event.message.content.slice(0, 180))
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Agent failed')
  const cause = error instanceof Error ? error.cause as { name?: string; status?: number; code?: string; message?: string } | undefined : undefined
  console.error({ name: cause?.name, status: cause?.status, code: cause?.code,
    detail: cause?.message?.replace(/sk-[\w-]+/g, '[redacted]').slice(0, 400) })
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
