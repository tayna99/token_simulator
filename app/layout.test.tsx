import { describe, expect, it } from 'vitest'

import RootLayout, { metadata } from './layout'

describe('Next root layout', () => {
  it('keeps browser translation disabled at the root', () => {
    expect(metadata.other).toMatchObject({ google: 'notranslate' })
    expect(metadata.title).toBe('AgentPayroll')

    const element = RootLayout({ children: <main>demo</main> })

    expect(element.type).toBe('html')
    expect(element.props.translate).toBe('no')
    expect(element.props.lang).toBe('ko')
  })
})
