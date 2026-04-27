import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WorkloadBuilder } from './index'
import type { WorkloadInputs } from '../../lib/workload'

const BASE: WorkloadInputs = {
  volumeBasis: 'requestsPerDay',
  activeDaysPerMonth: 30,
  retryRate: 0,
  requestsPerDay: 1_000,
  activeUsers: 0,
  requestsPerUserPerDay: 0,
  avgInputTokensPerRequest: 1_000,
  avgOutputTokensPerRequest: 100,
}

describe('WorkloadBuilder', () => {
  it('renders derived monthly readouts', () => {
    render(<WorkloadBuilder value={BASE} onChange={vi.fn()} />)
    expect(screen.getByText('30K')).toBeInTheDocument()
    expect(screen.getByText('30M')).toBeInTheDocument()
    expect(screen.getByText('3M')).toBeInTheDocument()
  })

  it('updates when workload props rerender', () => {
    const { rerender } = render(<WorkloadBuilder value={BASE} onChange={vi.fn()} />)
    expect(screen.getByText('30K')).toBeInTheDocument()

    rerender(<WorkloadBuilder value={{ ...BASE, requestsPerDay: 2_000 }} onChange={vi.fn()} />)
    expect(screen.getByText('60K')).toBeInTheDocument()
  })

  it('emits active-users basis changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<WorkloadBuilder value={BASE} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /active users/i }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ volumeBasis: 'activeUsers' }))
  })
})
