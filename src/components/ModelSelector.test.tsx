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
})
