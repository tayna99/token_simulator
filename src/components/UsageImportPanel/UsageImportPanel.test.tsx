import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UsageImportPanel } from './index'

describe('UsageImportPanel', () => {
  it('parses pasted CSV and sends imported usage summary', async () => {
    const user = userEvent.setup()
    const onImport = vi.fn()
    render(<UsageImportPanel onImport={onImport} />)

    await user.clear(screen.getByLabelText(/LLM usage CSV/i))
    await user.type(
      screen.getByLabelText(/LLM usage CSV/i),
      'feature,model,input_tokens,output_tokens,total_cost\nrag_chat,claude-sonnet-4.6,1000,500,0.01',
    )
    await user.click(screen.getByRole('button', { name: /apply csv usage/i }))

    expect(onImport).toHaveBeenCalledTimes(1)
    expect(onImport.mock.calls[0][0]).toMatchObject({
      requestCount: 1,
      totalInputTokens: 1000,
      totalOutputTokens: 500,
    })
  })

  it('loads a sample CSV for non-manual onboarding', async () => {
    const user = userEvent.setup()
    render(<UsageImportPanel onImport={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /use sample/i }))

    expect((screen.getByLabelText(/LLM usage CSV/i) as HTMLTextAreaElement).value).toContain('rag_chat')
    expect(screen.getByText(/Token fields are read from logs/i)).toBeInTheDocument()
  })
})
