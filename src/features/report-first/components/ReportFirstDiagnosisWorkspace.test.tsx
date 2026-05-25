import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReportFirstDiagnosisWorkspace } from './ReportFirstDiagnosisWorkspace'

function csvFor(feature: string, cost: number) {
  return [
    'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
    `2026-05-01T10:00:00Z,req_1,cust_001,pro,${feature},claude-sonnet-4.6,sess_1,run_1,1000,500,${cost},1200,success`,
  ].join('\n')
}

describe('ReportFirstDiagnosisWorkspace', () => {
  it('starts with the Korean margin diagnosis flow and hides internal machinery', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="production_demo_unavailable" />)

    expect(screen.getByRole('heading', { name: /AI 기능 때문에 손해 보는 고객을 찾으세요/ })).toBeInTheDocument()
    expect(screen.getByText(/어떤 고객과 기능이 마진을 깨는지 찾아드립니다/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /사용량 CSV 업로드/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Stripe\/매출 CSV 업로드/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /샘플로 보기/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Summary JSON/ })).toBeInTheDocument()
    expect(screen.queryByText(/RAG|Watchtower|agent route|parserStrategy|source:|evidence:|tool:/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /PDF 만들기/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /PDF 만들기/ })[0]).toBeDisabled()
  })

  it('updates the diagnosis preview when CSV state changes', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: { value: csvFor('rag_chat', 42) },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getByRole('heading', { name: /분석 완료/ })).toBeInTheDocument()
    expect(screen.getByText(/가장 위험한 비용 누수/)).toBeInTheDocument()
    expect(screen.getAllByText(/마진을 깨는 기능/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/추천 결정/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/rag_chat/).length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: { value: csvFor('agent_workflow', 77) },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getAllByText(/agent_workflow/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/rag_chat/)).not.toBeInTheDocument()
  })

  it('rejects summary JSON without a Trust inspection instead of parsing natural language', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /Summary JSON/ }))
    fireEvent.change(screen.getByLabelText(/구조화 summary JSON/i), {
      target: { value: '{"requestCount":1,"rows":[]}' },
    })
    fireEvent.click(screen.getByRole('button', { name: /summary 진단/ }))

    expect(screen.getByText(/summary_trust_inspection_missing/)).toBeInTheDocument()
    expect(screen.queryByText(/가장 위험한 비용 누수/)).not.toBeInTheDocument()
  })

  it('creates persisted artifacts before exposing the PDF download CTA', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/usage/import')) {
        return new Response(JSON.stringify({ snapshotRef: 'usage:p1:workspace-demo:2026-05' }), { status: 202 })
      }
      if (url.includes('/api/reports')) {
        return new Response(JSON.stringify({
          reportRun: {
            id: 'report-run-2026-05',
            artifacts: [{
              id: 'report-artifact:report-run-2026-05:pdf',
              format: 'pdf',
              downloadPath: '/api/reports/report-run-2026-05/download?artifactId=report-artifact:report-run-2026-05:pdf',
            }],
          },
        }), { status: 202 })
      }
      return new Response('{}', { status: 404 })
    })

    render(
      <ReportFirstDiagnosisWorkspace
        workspaceId="workspace-demo"
        productionStatus="connected"
        fetcher={fetcher}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: /샘플로 보기/ })[0])
    expect(screen.queryByRole('link', { name: /PDF 만들기/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /PDF 만들기/ }).find(button => !button.hasAttribute('disabled'))!)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /PDF 만들기/ })).toHaveAttribute(
        'href',
        '/api/reports/report-run-2026-05/download?artifactId=report-artifact:report-run-2026-05:pdf',
      )
    })
    expect(fetcher).toHaveBeenCalledWith('/api/reports', expect.objectContaining({ method: 'POST' }))
  })
})
