import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReportFirstDiagnosisWorkspace } from './ReportFirstDiagnosisWorkspace'

function csvFor(feature: string, cost: number) {
  return [
    'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
    `2026-05-01T10:00:00Z,req_1,cust_001,pro,${feature},claude-sonnet-4.6,sess_1,run_1,1000,500,${cost},1200,success`,
  ].join('\n')
}

describe('ReportFirstDiagnosisWorkspace', () => {
  it('starts with the Korean token leakage flow and hides internal machinery', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="production_demo_unavailable" />)

    expect(screen.getByRole('heading', { name: /API Token Leakage Snapshot/ })).toBeInTheDocument()
    expect(screen.getByText(/usage CSV \+ allowance CSV -> Trust Gate -> Token Leak -> Token Policy -> Adopt\/Reject\/Hold -> Report Preview/)).toHaveAttribute('lang', 'en')
    expect(screen.getByTestId('trust-assurance-panel')).toBeInTheDocument()
    expect(screen.getAllByText(/API Token Leakage Snapshot/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/300,000원 - 1,000,000원/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /사용량 CSV 업로드/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /allowance\/revenue CSV 업로드/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Helicone usage/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Langfuse usage/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /OpenAI usage/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Stripe allowance/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /샘플로 보기/ }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Summary JSON/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/RAG evidence|Watchtower|agent route|parserStrategy|source:|evidence:|tool:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/docs\/service-validation|docs\/templates|asset:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/production_demo_unavailable|UsageImportSummary|trustInspection|artifact|PDF gate|waiting_for_upload|raw_upload_delete/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('buyer-interview-coding-panel')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /PDF 리포트 다운로드/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /PDF 리포트 생성/ })[0]).toBeDisabled()
  })

  it('loads report-first import templates into the usage and allowance CSV inputs', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /Helicone usage/ }))
    const usageCsvInput = screen.getByLabelText(/사용량 CSV/i) as HTMLTextAreaElement
    expect(usageCsvInput.value).toContain('hc_req_001')
    expect(usageCsvInput.value).toContain('input_tokens')

    fireEvent.click(screen.getByRole('button', { name: /Stripe allowance/ }))
    const allowanceCsvInput = screen.getByLabelText(/token allowance\/revenue CSV/i) as HTMLTextAreaElement
    expect(allowanceCsvInput.value).toContain('included_tokens')
    expect(allowanceCsvInput.value).toContain('cus_heavy')

    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getByRole('heading', { name: /Token leak 분석 완료/ })).toBeInTheDocument()
    expect(screen.getAllByText(/Token allowance \+ overage 정책 후보/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/결정 후보를 먼저 선택하세요/)
  })

  it('qualifies ICP timing before a customer uploads CSV data', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    const gate = screen.getByTestId('icp-timing-gate')
    expect(gate).toHaveTextContent(/ICP timing/i)
    expect(gate).toHaveTextContent(/free_calculator/i)
    expect(gate).toHaveTextContent(/score: 0 \/ 5/i)

    fireEvent.change(screen.getByLabelText(/월 LLM\/API 비용/i), { target: { value: '3200000' } })
    fireEvent.click(screen.getByLabelText(/customer_id.*revenue_collected/i))
    fireEvent.click(screen.getByLabelText(/heavy user/i))
    fireEvent.change(screen.getByLabelText(/가격\/마진 결정 긴급도/i), { target: { value: 'pricing_or_margin_now' } })
    fireEvent.click(screen.getByLabelText(/CEO\/Finance 보고 필요/i))

    expect(gate).toHaveTextContent(/ICP grade: A/i)
    expect(gate).toHaveTextContent(/diagnosis_report/i)
    expect(gate).toHaveTextContent(/AI Token Leakage Report 진단 시작/i)
    expect(gate).toHaveTextContent(/3,200,000/)
  })

  it('routes urgent leads without revenue mapping to data readiness before diagnosis', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.change(screen.getByLabelText(/월 LLM\/API 비용/i), { target: { value: '3200000' } })
    fireEvent.click(screen.getByLabelText(/heavy user/i))
    fireEvent.change(screen.getByLabelText(/가격\/마진 결정 긴급도/i), { target: { value: 'pricing_or_margin_now' } })
    fireEvent.click(screen.getByLabelText(/CEO\/Finance 보고 필요/i))

    const gate = screen.getByTestId('icp-timing-gate')
    expect(gate).toHaveTextContent(/ICP grade: B/i)
    expect(gate).toHaveTextContent(/data_readiness_first/i)
    expect(gate).toHaveTextContent(/customer_id \+ revenue 매핑부터 확인/i)
  })

  it('keeps ICP timing inputs when CSV changes reset derived report state', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.change(screen.getByLabelText(/월 LLM\/API 비용/i), { target: { value: '3200000' } })
    fireEvent.click(screen.getByLabelText(/customer_id.*revenue_collected/i))
    fireEvent.click(screen.getByLabelText(/heavy user/i))
    fireEvent.click(screen.getByLabelText(/CEO\/Finance 보고 필요/i))
    fireEvent.click(screen.getByRole('button', { name: /SparkClaw 샘플로 진단/ }))
    fireEvent.click(screen.getByLabelText(/Token allowance \+ overage 정책 후보/))
    fireEvent.click(screen.getByRole('button', { name: /Hold/ }))

    expect(screen.getByTestId('local-report-preview')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: { value: csvFor('agent_workflow', 77) },
    })

    expect(screen.getByLabelText(/월 LLM\/API 비용/i)).toHaveValue('3200000')
    expect(screen.getByTestId('icp-timing-gate')).toHaveTextContent(/diagnosis_report/i)
    expect(screen.queryByTestId('local-report-preview')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Langfuse usage/ }))
    fireEvent.click(screen.getByRole('button', { name: /Stripe allowance/ }))

    expect(screen.getByLabelText(/월 LLM\/API 비용/i)).toHaveValue('3200000')
    expect(screen.getByTestId('icp-timing-gate')).toHaveTextContent(/diagnosis_report/i)
  })

  it('codes buyer interview objections behind expert mode', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

    const panel = screen.getByTestId('buyer-interview-coding-panel')
    expect(panel).toHaveTextContent(/Buyer interview coding/i)
    expect(panel).toHaveTextContent(/objection_margin_not_felt/i)
    expect(panel).toHaveTextContent(/objection_positioning_confusing/i)

    fireEvent.click(screen.getByRole('button', { name: /샘플 반론 코딩/ }))

    expect(panel).toHaveTextContent(/requirement/i)
    expect(panel).toHaveTextContent(/product_copy/i)
    expect(panel).toHaveTextContent(/monthly leak/i)
    expect(panel).toHaveTextContent(/AI Token Leakage Report/i)

    fireEvent.change(screen.getByLabelText(/buyer interview notes/i), {
      target: {
        value: [
          '엑셀이나 SQL로 보면 됩니다.',
          '개발자가 SQL로 뽑으면 됩니다.',
        ].join('\n'),
      },
    })

    expect(panel).toHaveTextContent(/objection_excel_sql_console/i)
    expect(panel).toHaveTextContent(/엑셀\/SQL이 보여주는 숫자/)
  })

  it('updates the diagnosis preview when CSV state changes', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: { value: csvFor('rag_chat', 42) },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getByRole('heading', { name: /Token leak 분석 완료/ })).toBeInTheDocument()
    expect(screen.getAllByText(/토큰 누수 고객/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/토큰을 가장 많이 태우는 기능/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Token policy 후보/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/rag_chat/).length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: { value: csvFor('agent_workflow', 77) },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getAllByText(/agent_workflow/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/rag_chat/)).not.toBeInTheDocument()
  })

  it('joins usage CSV with token allowance CSV so real customer allowance and revenue unlocks PDF eligibility', () => {
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
    fireEvent.change(screen.getByLabelText(/token allowance\/revenue CSV/i), {
      target: {
        value: [
          'customer_id,revenue_collected,included_tokens,overage_rate_usd_per_1k_tokens',
          'cus_loss,50,1000,0.20',
          'cus_healthy,200,5000,0.20',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getAllByText(/미회수 AI 원가/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('$70').length).toBeGreaterThan(0)
    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/결정 후보를 먼저 선택하세요/)
  })

  it('keeps PDF creation blocked when allowance CSV does not join to usage customers', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: {
        value: [
          'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
          '2026-05-01,req_1,cus_loss,pro,rag_chat,claude-sonnet-4.6,sess_1,run_1,1000,500,120,1200,success',
        ].join('\n'),
      },
    })
    fireEvent.change(screen.getByLabelText(/token allowance\/revenue CSV/i), {
      target: {
        value: [
          'customer_id,revenue_collected,included_tokens',
          'unrelated_customer,500,10000',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/customer_id, included_tokens, revenue_collected 매핑/)
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
    fireEvent.change(screen.getByLabelText(/token allowance\/revenue CSV/i), {
      target: {
        value: [
          'customer_id,revenue_collected,included_tokens',
          'cus_loss,,10000',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getAllByText(/customer_id, included_tokens, revenue_collected 매핑을 확인해야 PDF 리포트를 만들 수 있습니다/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/customer_id, included_tokens, revenue_collected 매핑/)
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
    expect(screen.queryByText(/토큰 누수 고객/)).not.toBeInTheDocument()
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

    fireEvent.click(screen.getByLabelText(/Token allowance \+ overage 정책 후보/))
    fireEvent.click(screen.getByRole('button', { name: /Hold/ }))
    expect(screen.getByTestId('local-report-preview')).toHaveTextContent(/API Token Leakage Report/)
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

    expect(screen.getByText(/고객별 token allowance와 매출 매핑/)).toBeInTheDocument()
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

    fireEvent.click(screen.getByLabelText(/Token allowance \+ overage 정책 후보/))

    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/Adopt\/Reject\/Hold 선택이 필요합니다/)
    fireEvent.click(screen.getByRole('button', { name: /Adopt/ }))
    expect(screen.getByTestId('local-report-preview')).toHaveTextContent(/Adopt/)

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

  it('clears the local report preview when a different usage template is applied', () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/usage/import')) {
        return new Response(JSON.stringify({ snapshotRef: 'usage:p1:workspace-demo:2026-05' }), { status: 202 })
      }
      return new Response('{}', { status: 404 })
    })

    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" fetcher={fetcher} />)

    fireEvent.click(screen.getByRole('button', { name: /SparkClaw 샘플로 진단/ }))
    fireEvent.click(screen.getByLabelText(/Token allowance \+ overage 정책 후보/))
    fireEvent.click(screen.getByRole('button', { name: /Hold/ }))

    expect(screen.getByTestId('local-report-preview')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Langfuse usage/ }))

    expect(screen.queryByTestId('local-report-preview')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))).toBeUndefined()
  })

  it('connects unit economics PDCA instrumentation to the visible report workflow', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

    fireEvent.click(screen.getByRole('button', { name: /SparkClaw 샘플로 진단/ }))

    const pdcaPanel = screen.getByTestId('unit-economics-pdca-panel')
    expect(pdcaPanel).toHaveTextContent(/Unit economics PDCA/i)
    expect(pdcaPanel).toHaveTextContent(/monthly_review_blocked/i)
    expect(pdcaPanel).toHaveTextContent(/decision_required/i)

    fireEvent.change(within(pdcaPanel).getByLabelText(/LLM\/API/i), { target: { value: '240000' } })
    fireEvent.change(within(pdcaPanel).getByLabelText(/결정 긴급도/i), { target: { value: 'pricing_or_margin_now' } })
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

    fireEvent.click(screen.getByLabelText(/Token allowance \+ overage 정책 후보/))
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
    fireEvent.click(screen.getByLabelText(/Token allowance \+ overage 정책 후보/))
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
