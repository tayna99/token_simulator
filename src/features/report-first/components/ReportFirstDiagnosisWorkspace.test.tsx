import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

    expect(screen.getByRole('heading', { name: /AI 비용 리포트 만들기/ })).toBeInTheDocument()
    expect(screen.getByText(/CSV\/summary -> Trust Gate -> Money Leak -> Decision Candidate -> Adopt\/Reject\/Hold -> PDF Report/)).toHaveAttribute('lang', 'en')
    expect(screen.getByTestId('trust-assurance-panel')).toBeInTheDocument()
    expect(screen.getByText(/AI Cost Snapshot/i)).toBeInTheDocument()
    expect(screen.getByText(/300,000원 - 1,000,000원/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /사용량 CSV 업로드/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Stripe\/매출 CSV 업로드/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /샘플로 보기/ }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Summary JSON/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/RAG evidence|Watchtower|agent route|parserStrategy|source:|evidence:|tool:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/docs\/service-validation|docs\/templates|asset:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/production_demo_unavailable|UsageImportSummary|trustInspection|artifact|PDF gate|waiting_for_upload|raw_upload_delete/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /PDF 리포트 다운로드/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /PDF 리포트 생성/ })[0]).toBeDisabled()
  })

  it('updates the diagnosis preview when CSV state changes', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

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

  it('joins usage CSV with revenue CSV so real customer and plan revenue unlocks PDF eligibility', () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/usage/import')) {
        return new Response(JSON.stringify({ snapshotRef: 'usage:p1:workspace-demo:2026-05' }), { status: 202 })
      }
      return new Response('{}', { status: 404 })
    })
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" fetcher={fetcher} />)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: {
        value: [
          'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
          '2026-05-01,req_1,cus_loss,pro,rag_chat,claude-sonnet-4.6,sess_1,run_1,1000,500,120,1200,success',
          '2026-05-01,req_2,cus_healthy,pro,summary,claude-sonnet-4.6,sess_2,run_2,1000,500,10,900,success',
        ].join('\n'),
      },
    })
    fireEvent.change(screen.getByLabelText(/매출 CSV/i), {
      target: {
        value: [
          'customer_id,plan_id,mrr',
          'cus_loss,pro,50',
          'cus_healthy,pro,200',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getAllByText(/이번 달 추정 누수/).length).toBeGreaterThan(0)
    expect(screen.getByText('$70')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/결정 후보를 먼저 선택하세요/)
  })

  it('keeps PDF creation blocked when revenue CSV does not join to usage customers and plans', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: {
        value: [
          'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
          '2026-05-01,req_1,cus_loss,pro,rag_chat,claude-sonnet-4.6,sess_1,run_1,1000,500,120,1200,success',
        ].join('\n'),
      },
    })
    fireEvent.change(screen.getByLabelText(/매출 CSV/i), {
      target: {
        value: [
          'customer_id,plan_id,mrr',
          'unrelated_customer,enterprise,500',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/customer_id, plan_id, revenue 매핑/)
  })

  it('keeps PDF creation blocked when revenue CSV normalizes blank revenue', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: {
        value: [
          'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
          '2026-05-01,req_1,cus_loss,pro,rag_chat,claude-sonnet-4.6,sess_1,run_1,1000,500,120,1200,success',
        ].join('\n'),
      },
    })
    fireEvent.change(screen.getByLabelText(/매출 CSV/i), {
      target: {
        value: [
          'customer_id,plan_id,mrr',
          'cus_loss,pro,',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getAllByText(/customer_id, plan_id, revenue 매핑을 확인해야 PDF 리포트를 만들 수 있습니다/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/customer_id, plan_id, revenue 매핑/)
  })

  it('does not persist blocked raw prompt or API key CSVs to the remote import endpoint', () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 202 }))
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" fetcher={fetcher} />)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: {
        value: [
          'timestamp,request_id,customer_id,plan_id,feature,model,input_tokens,output_tokens,total_cost,prompt,api_key',
          '2026-05-01,req_1,cus_loss,pro,rag_chat,claude-sonnet-4.6,1000,500,120,"raw customer text",sk-test',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getAllByText(/차단된 필드를 제거한 뒤 다시 업로드하세요/).length).toBeGreaterThan(0)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects summary JSON without a Trust inspection instead of parsing natural language', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

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
    expect(screen.queryByRole('link', { name: /PDF 리포트 다운로드/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/요금제\/credit 정책 변경 후보/))
    fireEvent.click(screen.getByRole('button', { name: /Hold/ }))
    fireEvent.click(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))!)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /PDF 리포트 다운로드/ })).toHaveAttribute(
        'href',
        '/api/reports/report-run-2026-05/download?artifactId=report-artifact:report-run-2026-05:pdf',
      )
    })
    expect(fetcher).toHaveBeenCalledWith('/api/reports', expect.objectContaining({ method: 'POST' }))
  })

  it('keeps customer evidence details free of internal refs after reveal', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /SparkClaw 샘플로 진단/ }))

    expect(screen.queryByText(/tool:diagnosis/)).not.toBeInTheDocument()
    expect(screen.queryByText(/source:|evidence:|Watchtower|RAG evidence|agent route/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /근거 보기/ }))

    expect(screen.getByText(/고객별 사용량과 매출 매핑/)).toBeInTheDocument()
    expect(screen.getByText(/결정 후보 계산/)).toBeInTheDocument()
    expect(screen.queryByText(/tool:diagnosis|usage:p1|source:|evidence:|Watchtower|RAG evidence|agent route|artifact|PDF gate|mapping_gap/i)).not.toBeInTheDocument()
  })

  it('requires explicit Adopt Reject or Hold before creating a PDF report', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
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
        audience="expert"
        fetcher={fetcher}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /SparkClaw 샘플로 진단/ }))

    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/결정 후보를 먼저 선택하세요/)
    expect(screen.getByText(/Adopt\/Reject\/Hold 선택이 필요합니다/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))).toBeUndefined()

    fireEvent.click(screen.getByLabelText(/요금제\/credit 정책 변경 후보/))

    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/Adopt\/Reject\/Hold 선택이 필요합니다/)
    fireEvent.click(screen.getByRole('button', { name: /Adopt/ }))

    const enabledPdfButton = screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))
    expect(enabledPdfButton).toBeDefined()
    fireEvent.click(enabledPdfButton!)

    await waitFor(() => expect(screen.getByRole('link', { name: /PDF 리포트 다운로드/ })).toBeInTheDocument())
    const reportCall = fetcher.mock.calls.find(([input]) => String(input).includes('/api/reports'))
    expect(JSON.parse(String(reportCall?.[1]?.body)).reportFirst).toMatchObject({
      decisionRefs: ['decision:diagnosis:pricing-policy'],
      decisionChoice: 'adopt',
      humanApproval: {
        required: true,
        decisionChoice: 'adopt',
        approvedBy: 'workspace_user',
        approvalMode: 'explicit_button',
      },
      runtimeProof: {
        status: 'deterministic_preview',
        fallbackReason: 'money_leak_run_deterministic_snapshot_only',
        agentInvocationProof: [],
      },
    })
  })

  it('connects unit economics PDCA instrumentation to the visible report workflow', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

    fireEvent.click(screen.getByRole('button', { name: /SparkClaw 샘플로 진단/ }))

    const pdcaPanel = screen.getByTestId('unit-economics-pdca-panel')
    expect(pdcaPanel).toHaveTextContent(/Unit economics PDCA/i)
    expect(pdcaPanel).toHaveTextContent(/monthly_review_blocked/i)
    expect(pdcaPanel).toHaveTextContent(/decision_required/i)

    fireEvent.change(screen.getByLabelText(/월 LLM\/API 비용/i), { target: { value: '240000' } })
    fireEvent.change(screen.getByLabelText(/Free Fit Check minutes/i), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText(/Data Readiness minutes/i), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText(/Snapshot minutes/i), { target: { value: '240' } })
    fireEvent.change(screen.getByLabelText(/Operator touch count/i), { target: { value: '3' } })
    fireEvent.click(screen.getByLabelText(/Decision owner confirmed/i))

    expect(pdcaPanel).toHaveTextContent(/ICP grade: A/i)
    expect(pdcaPanel).toHaveTextContent(/route: snapshot_or_monthly_review/i)
    expect(pdcaPanel).toHaveTextContent(/Free Fit: exceeded/i)
    expect(pdcaPanel).toHaveTextContent(/Data Readiness: exceeded/i)
    expect(pdcaPanel).toHaveTextContent(/Snapshot: exceeded/i)
    expect(pdcaPanel).toHaveTextContent(/operator touch: exceeded/i)
    expect(pdcaPanel).toHaveTextContent(/stop_free_analysis_and_route_to_paid_readiness/i)

    fireEvent.click(screen.getByLabelText(/요금제\/credit 정책 변경 후보/))
    fireEvent.click(screen.getByRole('button', { name: /Hold/ }))
    fireEvent.change(screen.getByLabelText(/다음 리뷰 날짜/i), { target: { value: '2026-06-26' } })

    expect(pdcaPanel).toHaveTextContent(/monthly_review_blocked/i)
    expect(pdcaPanel).toHaveTextContent(/persisted_report_artifact_required/i)
  })

  it('clears the decision choice and persisted PDF artifact when the CSV source changes', async () => {
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
        audience="expert"
        fetcher={fetcher}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /SparkClaw 샘플로 진단/ }))
    fireEvent.click(screen.getByLabelText(/요금제\/credit 정책 변경 후보/))
    fireEvent.click(screen.getByRole('button', { name: /Adopt/ }))
    fireEvent.click(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))!)

    await waitFor(() => expect(screen.getByRole('link', { name: /PDF 리포트 다운로드/ })).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: { value: csvFor('agent_workflow', 77) },
    })

    expect(screen.queryByRole('link', { name: /PDF 리포트 다운로드/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))).toBeUndefined()
  })

  it('ignores stale snapshot refs from an older delayed CSV import', async () => {
    let resolveFirstImport!: (response: Response) => void
    const firstImport = new Promise<Response>(resolve => {
      resolveFirstImport = resolve
    })
    let importCount = 0
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/usage/import')) {
        importCount += 1
        if (importCount === 1) return firstImport
        return new Response(JSON.stringify({ snapshotRef: 'usage:p1:newer-run' }), { status: 202 })
      }
      return new Response('{}', { status: 404 })
    })

    render(
      <ReportFirstDiagnosisWorkspace
        workspaceId="workspace-demo"
        productionStatus="connected"
        audience="expert"
        fetcher={fetcher}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /SparkClaw 샘플로 진단/ }))
    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: { value: csvFor('agent_workflow', 77) },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))
    fireEvent.click(screen.getByRole('button', { name: /근거 보기/ }))

    await waitFor(() => expect(screen.getByText('usage:p1:newer-run')).toBeInTheDocument())

    await act(async () => {
      resolveFirstImport(new Response(JSON.stringify({ snapshotRef: 'usage:p1:older-run' }), { status: 202 }))
      await firstImport
    })

    expect(screen.queryByText('usage:p1:older-run')).not.toBeInTheDocument()
  })
})
