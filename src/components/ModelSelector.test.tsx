import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModelSelector } from './ModelSelector'
import { MODELS } from '../data/models'

describe('ModelSelector', () => {
  it('renders provenance and support metadata for the selected model', () => {
    render(
      <ModelSelector
        label="Current model"
        value="claude-sonnet-4.6"
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Anthropic/i)).toBeInTheDocument()
    expect(screen.getByText(/verified/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /pricing source/i })).toHaveAttribute(
      'href',
      MODELS.find(m => m.id === 'claude-sonnet-4.6')!.sourceUrl
    )
    expect(screen.getByText(/cache/i)).toBeInTheDocument()
    expect(screen.getByText(/batch/i)).toBeInTheDocument()
  })

  it('renders GPT-5.5 price, context, and long-context pricing note', () => {
    render(
      <ModelSelector
        label="Candidate model"
        value="gpt-5.5"
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/GPT-5.5/i)).toBeInTheDocument()
    expect(screen.getByText(/Context 1M/i)).toBeInTheDocument()
    expect(screen.getAllByText(/\$5.00 \/ \$30.00 per 1M tokens/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/under 270K/i)).toBeInTheDocument()
  })

  it('shows announced models without API pricing but disables them for deterministic cost selection', () => {
    render(
      <ModelSelector
        label="Candidate model"
        value="claude-sonnet-4.6"
        onChange={vi.fn()}
      />
    )

    const omniOption = screen.getByRole('option', {
      name: /Gemini Omni Flash - API pricing not published/i,
    }) as HTMLOptionElement

    expect(omniOption).toBeDisabled()
  })

  it('renders Cursor Composer models under the Cursor provider label', () => {
    render(
      <ModelSelector
        label="Candidate model"
        value="composer-2.5-fast"
        onChange={vi.fn()}
      />
    )

    expect(screen.getAllByText(/Cursor/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Composer 2\.5 Fast/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\$3.00 \/ \$15.00 per 1M tokens/i).length).toBeGreaterThan(0)
  })

  it('renders unknown context windows without showing a zero-token limit', () => {
    render(
      <ModelSelector
        label="Candidate model"
        value="qwen3.7-max"
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Context not listed/i)).toBeInTheDocument()
    expect(screen.queryByText(/^Context 0$/i)).not.toBeInTheDocument()
  })
})
