import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge, Button, Field, MetricTile, Surface } from './primitives'

describe('ui primitives', () => {
  it('renders a surface with title and eyebrow', () => {
    render(
      <Surface eyebrow="Baseline" title="Current model cost">
        <p>Body</p>
      </Surface>,
    )

    expect(screen.getByRole('heading', { name: 'Current model cost' })).toBeInTheDocument()
    expect(screen.getByText('Baseline')).toHaveClass('text-primary-normal')
  })

  it('renders button variants on native buttons', () => {
    render(<Button variant="primary">Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('bg-primary-normal')
  })

  it('renders badge tones and metric tiles', () => {
    render(
      <>
        <Badge tone="positive">Low risk</Badge>
        <MetricTile label="Monthly cost" value="$225/mo" help="Before optimization" />
      </>,
    )

    expect(screen.getByText('Low risk')).toHaveClass('text-status-positive')
    expect(screen.getByText('$225/mo')).toHaveAttribute('translate', 'no')
    expect(screen.getByText('Before optimization')).toBeInTheDocument()
  })

  it('associates field labels with controls', () => {
    render(
      <Field label="Metric name" htmlFor="metric-name" help="Use a tracked business unit.">
        <input id="metric-name" />
      </Field>,
    )

    expect(screen.getByLabelText('Metric name')).toBeInTheDocument()
    expect(screen.getByText('Use a tracked business unit.')).toBeInTheDocument()
  })
})
