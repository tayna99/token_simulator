import { describe, expect, it } from 'vitest'
import productUx from '../../../../docs/PRODUCT_UX.md?raw'
import landingUx from '../../../../docs/LANDING_UX.md?raw'

describe('P1 product UX docs', () => {
  it('documents the unified customer web app and P1 operating surfaces in PRODUCT_UX', () => {
    expect(productUx).toContain('Trust Intake')
    expect(productUx).toContain('웹앱 첫 화면')
    expect(productUx).toContain('Customer-facing SaaS Dashboard')
    expect(productUx).toContain('Supervisor Agent-as-Tool')
    expect(productUx).toContain('Full RAG')
    expect(productUx).toContain('Slack/Email')
    expect(productUx).toContain('Stripe')
    expect(productUx).toContain('vLLM/GPU')
    expect(productUx).toContain('Official Research Watchtower')
    expect(productUx).toContain('Qwen')
    expect(productUx).toContain('Kimi')
    expect(productUx).toContain('GLM')
    expect(productUx).toContain('단일 웹앱')
    expect(productUx).toContain('1인 창업자')
    expect(productUx).toContain('Pretendard 단일 서체')
    expect(productUx).not.toContain('Wanted Sans')
  })

  it('reclassifies LANDING_UX as onboarding guidance inside the web app instead of a separate implementation surface', () => {
    expect(landingUx).toContain('웹앱 첫 화면')
    expect(landingUx).toContain('독립 랜딩 구현은 P1에서 보류')
    expect(landingUx).toContain('별도 랜딩 라우트를 만들지 않는다')
    expect(landingUx).toContain('샘플 실행')
    expect(landingUx).toContain('usage export 업로드')
    expect(landingUx).toContain('Pretendard 단일 서체')
    expect(landingUx).not.toContain('Wanted Sans')
  })
})
