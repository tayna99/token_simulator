import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UsageImportPanel } from './index'

describe('UsageImportPanel', () => {
  it('parses pasted CSV and sends imported usage summary', async () => {
    const onImport = vi.fn()
    render(<UsageImportPanel onImport={onImport} />)

    fireEvent.change(screen.getByLabelText(/LLM usage CSV/i), {
      target: {
        value: 'feature,model,input_tokens,output_tokens,total_cost\nrag_chat,claude-sonnet-4.6,1000,500,0.01',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /apply csv usage/i }))

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

  it('shows Trust blocking and does not import raw prompt CSVs', () => {
    const onImport = vi.fn()
    render(<UsageImportPanel onImport={onImport} />)

    fireEvent.change(screen.getByLabelText(/LLM usage CSV/i), {
      target: {
        value: 'feature,model,input_tokens,output_tokens,prompt\nrag_chat,claude-sonnet-4.6,1000,500,"hello"',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /apply csv usage/i }))

    expect(onImport).not.toHaveBeenCalled()
    expect(screen.getByText(/trust pipeline blocked/i)).toBeInTheDocument()
    expect(screen.getByText('raw prompt는 수집하지 않았습니다.')).toBeInTheDocument()
    expect(screen.getByText('API key 후보는 차단했습니다.')).toBeInTheDocument()
    expect(screen.getByText(/raw_prompt_detected/i)).toBeInTheDocument()
  })

  it('updates the partial diagnosis sections when CSV mappings improve', () => {
    const onImport = vi.fn()
    render(<UsageImportPanel onImport={onImport} />)

    fireEvent.change(screen.getByLabelText(/LLM usage CSV/i), {
      target: {
        value: 'feature,model,input_tokens,output_tokens,total_cost\nrag_chat,claude-sonnet-4.6,1000,500,0.01',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /apply csv usage/i }))

    expect(screen.getByText(/What we can analyze now/i)).toBeInTheDocument()
    expect(screen.getByText(/Mapping that improves accuracy/i)).toBeInTheDocument()
    expect(screen.getByText(/Judgments deferred by missing columns/i)).toBeInTheDocument()
    expect(screen.getByText('customer_id')).toBeInTheDocument()
    expect(screen.getByText('loss_customer')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/LLM usage CSV/i), {
      target: {
        value: [
          'customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,revenue',
          'cust_001,pro,rag_chat,claude-sonnet-4.6,sess_001,run_001,1000,500,0.01,29',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /apply csv usage/i }))

    expect(screen.getByText(/All key mappings are present/i)).toBeInTheDocument()
    expect(screen.getByText(/No judgments are deferred/i)).toBeInTheDocument()
  })

  it('renders Trust reassurance before the usage CSV field', () => {
    render(<UsageImportPanel onImport={vi.fn()} />)

    const reassurance = screen.getByTestId('trust-assurance-panel')
    const csvField = screen.getByLabelText(/LLM usage CSV/i)

    expect(Boolean(reassurance.compareDocumentPosition(csvField) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })
})
