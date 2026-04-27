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
})
