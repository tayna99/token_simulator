import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('PRD v4 connector-ready product direction', () => {
  it('documents the connector-ready ledger scope without replacing older PRDs', () => {
    const prd = readFileSync(join(process.cwd(), 'docs', 'PRD-v4.md'), 'utf8')

    expect(prd).toContain('AI 기능별 단위경제 의사결정 원장')
    expect(prd).toContain('데이터 출처')
    expect(prd).toContain('토큰 경제 트렌드')
    expect(prd).toContain('기능별 성과 측정 계약')
    expect(prd).toContain('커넥터 준비 범위')
    expect(prd).toContain('비목표')
    expect(prd).toContain('구현 계획')
    expect(prd).toContain('비용 높음 ≠ 누수')
    expect(prd).toContain('cached tokens')
    expect(prd).toContain('Langfuse')
    expect(prd).toContain('Helicone')
    expect(prd).toContain('Stripe')
  })
})
