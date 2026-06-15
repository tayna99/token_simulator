import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReportFirstDiagnosisWorkspace } from './ReportFirstDiagnosisWorkspace'

afterEach(() => {
  window.localStorage.clear()
  window.history.replaceState(null, '', '/')
})

function csvFor(feature: string, cost: number) {
  return [
    'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
    `2026-05-01T10:00:00Z,req_1,cust_001,pro,${feature},claude-sonnet-4.6,sess_1,run_1,1000,500,${cost},1200,success`,
  ].join('\n')
}

function clickDemoScene(name: RegExp | string) {
  fireEvent.click(within(screen.getByTestId('demo-workflow-tabs')).getByRole('tab', { name }))
}

function recordDecision(candidate: RegExp, choice: RegExp) {
  clickDemoScene(/결정 기록/)
  fireEvent.click(screen.getByLabelText(candidate))
  fireEvent.click(screen.getByRole('button', { name: choice }))
}

describe('ReportFirstDiagnosisWorkspace', () => {
  it('starts with the Korean token leakage flow and hides internal machinery', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="production_demo_unavailable" />)

    expect(screen.getByRole('heading', { name: /이번 달 AI 비용이 새는 곳을 찾습니다/ })).toBeInTheDocument()
    expect(screen.getByText(/사용량 CSV \+ 요금제\/매출 CSV -> 리포트 준비 확인 -> 손해 고객 -> 마진을 깨는 기능 -> 토큰 정책 후보 -> 채택\/보류\/거절 -> 리포트 미리보기/)).toBeInTheDocument()
    expect(screen.getByTestId('trust-assurance-panel')).toBeInTheDocument()
    expect(screen.getAllByText(/AI 비용 누수 진단/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/300,000원 - 1,000,000원/i)).toBeInTheDocument()
    const uploadPanel = screen.getByTestId('csv-upload-panel')
    expect(screen.getByTestId('csv-to-report-note')).toHaveTextContent(/올리는 것은 리포트가 아니라 사용량 CSV와 요금제\/매출 CSV/)
    expect(screen.getByTestId('csv-to-report-note')).toHaveTextContent(/리포트는 분석 후 결정 기록을 남기면 만들어집니다/)
    const sourceGuide = screen.getByTestId('csv-source-guide')
    expect(sourceGuide).toHaveTextContent(/이 CSV는 어디서 가져오나요/)
    expect(sourceGuide).toHaveTextContent(/Helicone|Langfuse|OpenAI export|내부 API 서버 로그/)
    expect(sourceGuide).toHaveTextContent(/Stripe|billing DB|재무 스프레드시트/)
    expect(sourceGuide).toHaveTextContent(/개발자 또는 데이터 담당자/)
    expect(sourceGuide).toHaveTextContent(/운영 또는 재무 담당자/)
    const connectorPanel = screen.getByTestId('connector-readiness-panel')
    expect(connectorPanel).toHaveTextContent(/지원되는 데이터 출처/)
    expect(connectorPanel).toHaveTextContent(/LLM 사용량/)
    expect(connectorPanel).toHaveTextContent(/CSV 계약 준비|샘플 지원/)
    expect(connectorPanel).toHaveTextContent(/API 미연결/)
    expect(connectorPanel).toHaveTextContent(/외부 API를 호출하지 않습니다/)
    expect(uploadPanel).toHaveTextContent(/사용량 파일 선택/)
    expect(uploadPanel).toHaveTextContent(/요금제\/매출 파일 선택/)
    expect(uploadPanel).toHaveTextContent(/성과 이벤트 파일 선택/)
    expect(within(uploadPanel).getByRole('link', { name: /사용량 샘플 CSV 다운로드/ })).toHaveAttribute('href', '/demo/agentpayroll-usage-sample.csv')
    expect(within(uploadPanel).getByRole('link', { name: /요금제\/매출 샘플 CSV 다운로드/ })).toHaveAttribute('href', '/demo/agentpayroll-allowance-revenue-sample.csv')
    expect(within(uploadPanel).getByRole('link', { name: /성과 이벤트 샘플 CSV 다운로드/ })).toHaveAttribute('href', '/demo/agentpayroll-outcome-sample.csv')
    expect(screen.getByTestId('measurement-contract-panel')).toHaveTextContent(/성과 기준 만들기/)
    expect(screen.getByTestId('measurement-contract-panel')).toHaveTextContent(/AI는 후보만 제안하고 사람이 기준을 선택/)
    expect(screen.queryByRole('button', { name: /사용량 CSV 올리기/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /요금제\/매출 CSV 올리기/ })).not.toBeInTheDocument()
    expect(uploadPanel.compareDocumentPosition(screen.getByTestId('icp-timing-gate')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: /Helicone 사용량/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Langfuse 사용량/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /OpenAI 사용량/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Anthropic 사용량/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gemini 사용량/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Vercel AI Gateway 사용량/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /요금제\/매출 샘플/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Stripe 요금제\/매출/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /샘플 데이터로 진단하기/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/포함 토큰|초과 사용량|미회수 AI 원가/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/가격\/마진 결정 긴급도|pricing_or_margin_now|Pro 고객|Pro plan|plan margin|플랜 마진/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('unit-economics-pdca-panel')).not.toBeInTheDocument()
    expect(screen.queryByText(/Monthly Review|monthly_review|snapshot_or_monthly_review/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /요약 JSON/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/RAG evidence|Watchtower|agent route|parserStrategy|source:|evidence:|tool:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/docs\/service-validation|docs\/templates|asset:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/production_demo_unavailable|UsageImportSummary|trustInspection|artifact|PDF gate|waiting_for_upload|raw_upload_delete/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('buyer-interview-coding-panel')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /PDF 리포트 다운로드/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /PDF 리포트 생성/ })[0]).toBeDisabled()
  })

  it('loads report-first import templates into the usage and allowance CSV inputs', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /Helicone 사용량/ }))
    const usageCsvInput = screen.getByLabelText(/사용량 CSV/i) as HTMLTextAreaElement
    expect(usageCsvInput.value).toContain('hc_req_001')
    expect(usageCsvInput.value).toContain('input_tokens')

    fireEvent.click(screen.getByRole('button', { name: /요금제\/매출 샘플/ }))
    const allowanceCsvInput = screen.getByLabelText(/요금제\/매출 CSV/i) as HTMLTextAreaElement
    expect(allowanceCsvInput.value).toContain('included_tokens')
    expect(allowanceCsvInput.value).toContain('Northstar Health')

    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getByRole('heading', { name: /비용 누수 분석 완료/ })).toBeInTheDocument()
    expect(screen.getAllByText(/포함 토큰 \+ 초과 과금 정책 후보/).length).toBeGreaterThan(0)
    clickDemoScene(/리포트 보기/)
    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/결정 후보를 먼저 선택하세요/)
  })

  it('shows scene tabs and a locked scene before analysis so users know the next screens exist', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    const workflowTabs = screen.getByTestId('demo-workflow-tabs')
    expect(workflowTabs).toHaveTextContent(/진단하기/)
    expect(workflowTabs).toHaveTextContent(/진단 결과/)
    expect(workflowTabs).toHaveTextContent(/역할별 판단/)
    expect(workflowTabs).toHaveTextContent(/결정 기록/)
    expect(workflowTabs).toHaveTextContent(/리포트 보기/)
    expect(workflowTabs).toHaveTextContent(/다음 달 검산/)
    expect(workflowTabs).toHaveTextContent(/AI 팀 작업 과정/)
    expect(workflowTabs).toHaveTextContent(/샘플 또는 CSV 분석 후 열립니다/)
    expect(workflowTabs).toHaveTextContent(/CEO \/ PM \/ 개발자/)
    expect(within(workflowTabs).getByRole('tab', { name: /역할별 판단/ })).toHaveAttribute('aria-disabled', 'true')
    expect(within(workflowTabs).getByRole('tab', { name: /결정 기록/ })).toHaveAttribute('aria-disabled', 'true')
    expect(within(workflowTabs).getByRole('tab', { name: /리포트 보기/ })).toHaveAttribute('aria-disabled', 'true')
    expect(within(workflowTabs).getByRole('tab', { name: /다음 달 검산/ })).toHaveAttribute('aria-disabled', 'true')

    clickDemoScene(/역할별 판단/)

    const lockedScene = screen.getByTestId('locked-scene-panel')
    expect(within(lockedScene).getByRole('heading', { name: /역할별 판단/ })).toBeInTheDocument()
    expect(lockedScene).toHaveTextContent(/CEO \/ PM \/ 개발자 탭/)
    expect(lockedScene).toHaveTextContent(/샘플 또는 CSV 분석 후 열립니다/)
    expect(screen.queryByTestId('csv-upload-panel')).not.toBeInTheDocument()
    expect(screen.queryByTestId('csv-source-guide')).not.toBeInTheDocument()
  })

  it('imports real usage and allowance CSV files from file inputs', async () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    const usageFile = new File([
      [
        'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
        '2026-05-01T10:00:00Z,file_req_001,cust_file,pro,agent_workflow,claude-sonnet-4.6,sess_file,run_file,200000,100000,90,1900,success',
      ].join('\n'),
    ], 'usage.csv', { type: 'text/csv' })
    const allowanceFile = new File([
      [
        'customer_id,plan_id,revenue_collected,included_tokens,overage_rate_usd_per_1k_tokens',
        'cust_file,pro,29,100000,0.18',
      ].join('\n'),
    ], 'allowance.csv', { type: 'text/csv' })

    fireEvent.change(screen.getByLabelText(/사용량 파일 선택/i), { target: { files: [usageFile] } })
    fireEvent.change(screen.getByLabelText(/요금제\/매출 파일 선택/i), { target: { files: [allowanceFile] } })

    await waitFor(() => expect((screen.getByLabelText(/^사용량 CSV$/i) as HTMLTextAreaElement).value).toContain('file_req_001'))
    await waitFor(() => expect((screen.getByLabelText(/^요금제\/매출 CSV$/i) as HTMLTextAreaElement).value).toContain('cust_file'))
  })

  it('keeps outcome leakage partial when the user has not uploaded outcome CSV', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /Helicone 사용량/ }))
    fireEvent.click(screen.getByRole('button', { name: /요금제\/매출 샘플/ }))
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getByRole('heading', { name: /비용 누수 분석 완료/ })).toBeInTheDocument()
    const outcomePanel = screen.getByTestId('outcome-verification-panel')
    expect(outcomePanel).toHaveTextContent(/성과 검증: 부분 검증/)
    expect(outcomePanel).toHaveTextContent(/성과 이벤트 CSV가 없어 성과 누수로 확정하지 않습니다/)
    expect(screen.queryByText(/성과가 낮습니다/)).not.toBeInTheDocument()

    recordDecision(/포함 토큰 \+ 초과 과금 정책 후보/, /보류/)
    clickDemoScene(/리포트 보기/)

    const preview = screen.getByTestId('local-report-preview')
    expect(preview).toHaveTextContent(/성과 기준/)
    expect(preview).toHaveTextContent(/검증 등급: 부분 검증/)
  })

  it('uses outcome CSV to make outcome leakage verifiable and keeps the selected measurement contract in the report', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))

    expect(screen.getByRole('heading', { name: /비용 누수 분석 완료/ })).toBeInTheDocument()
    const outcomePanel = screen.getByTestId('outcome-verification-panel')
    expect(outcomePanel).toHaveTextContent(/성과 검증: 검증 가능/)
    expect(outcomePanel).toHaveTextContent(/성과 누수 후보/)
    expect(outcomePanel).toHaveTextContent(/다운로드 또는 공유된 리포트/)

    recordDecision(/포함 토큰 \+ 초과 과금 정책 후보/, /채택/)
    clickDemoScene(/리포트 보기/)

    const preview = screen.getByTestId('local-report-preview')
    expect(preview).toHaveTextContent(/성과 기준: 다운로드 또는 공유된 리포트/)
    expect(preview).toHaveTextContent(/원가 기준: 생성 비용 \+ 재생성 비용/)
    expect(preview).toHaveTextContent(/누수 기준: 실제 사용률 30% 미만/)
    expect(preview).toHaveTextContent(/검증 등급: 검증 가능/)
    expect(preview).toHaveTextContent(/데이터 출처 검증/)
    expect(preview).toHaveTextContent(/사용량 CSV 계약 준비/)
  })

  it('qualifies ICP timing before a customer uploads CSV data', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    const gate = screen.getByTestId('icp-timing-gate')
    expect(gate).toHaveTextContent(/진단 적합도 확인/)
    expect(gate).toHaveTextContent(/샘플 먼저 보기/)
    expect(gate).toHaveTextContent(/점수: 0 \/ 5/i)

    fireEvent.change(screen.getByLabelText(/월 LLM\/API 비용/i), { target: { value: '3200000' } })
    fireEvent.click(screen.getByLabelText(/customer_id.*revenue_collected/i))
    fireEvent.click(screen.getByLabelText(/과다 사용 고객/i))
    fireEvent.change(screen.getByLabelText(/토큰 누수 결정 긴급도/i), { target: { value: 'pricing_or_margin_now' } })
    fireEvent.click(screen.getByLabelText(/대표\/재무 보고 필요/i))

    expect(gate).toHaveTextContent(/진단 등급 A/)
    expect(gate).toHaveTextContent(/유료 진단 후보/)
    expect(gate).toHaveTextContent(/AI 비용 누수 리포트 진단 시작/)
    expect(gate).toHaveTextContent(/3,200,000/)
  })

  it('routes urgent leads without revenue mapping to data readiness before diagnosis', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.change(screen.getByLabelText(/월 LLM\/API 비용/i), { target: { value: '3200000' } })
    fireEvent.click(screen.getByLabelText(/과다 사용 고객/i))
    fireEvent.change(screen.getByLabelText(/토큰 누수 결정 긴급도/i), { target: { value: 'pricing_or_margin_now' } })
    fireEvent.click(screen.getByLabelText(/대표\/재무 보고 필요/i))

    const gate = screen.getByTestId('icp-timing-gate')
    expect(gate).toHaveTextContent(/진단 등급 B/)
    expect(gate).toHaveTextContent(/데이터 준비 먼저/)
    expect(gate).toHaveTextContent(/customer_id \+ revenue 매핑부터 확인/i)
  })

  it('keeps ICP timing inputs when CSV changes reset derived report state', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.change(screen.getByLabelText(/월 LLM\/API 비용/i), { target: { value: '3200000' } })
    fireEvent.click(screen.getByLabelText(/customer_id.*revenue_collected/i))
    fireEvent.click(screen.getByLabelText(/과다 사용 고객/i))
    fireEvent.click(screen.getByLabelText(/대표\/재무 보고 필요/i))
    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))
    recordDecision(/포함 토큰 \+ 초과 과금 정책 후보/, /보류/)
    clickDemoScene(/리포트 보기/)

    expect(screen.getByTestId('local-report-preview')).toBeInTheDocument()

    clickDemoScene(/진단하기/)
    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: { value: csvFor('agent_workflow', 77) },
    })

    expect(screen.getByLabelText(/월 LLM\/API 비용/i)).toHaveValue('3200000')
    expect(screen.getByTestId('icp-timing-gate')).toHaveTextContent(/유료 진단 후보/)
    expect(screen.queryByTestId('local-report-preview')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Langfuse 사용량/ }))
    fireEvent.click(screen.getByRole('button', { name: /요금제\/매출 샘플/ }))

    expect(screen.getByLabelText(/월 LLM\/API 비용/i)).toHaveValue('3200000')
    expect(screen.getByTestId('icp-timing-gate')).toHaveTextContent(/유료 진단 후보/)
  })

  it('shows the AgentPayroll sample as a token allowance leakage story', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))

    expect(screen.getByRole('heading', { name: /비용 누수 분석 완료/ })).toBeInTheDocument()
    expect(screen.getAllByText(/Northstar Health/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/cust_001/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/회수된 매출은 \$29/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/AI 토큰 원가는 \$178/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/미회수 AI 원가 \$149/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/전체 AI 비용의 51%/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Pro 요금제 매출 대비 259%/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/예상 회수 후보: \$149/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Pro 고객|plan margin|플랜 마진/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/model routing|라우팅|cheaper model|A\/B test/i)).not.toBeInTheDocument()

    recordDecision(/포함 토큰 \+ 초과 과금 정책 후보/, /보류/)
    clickDemoScene(/리포트 보기/)

    const preview = screen.getByTestId('local-report-preview')
    expect(preview).toHaveTextContent(/AI 비용 누수 리포트/)
    expect(preview).toHaveTextContent(/revenue_collected|회수된 매출/)
    expect(preview).toHaveTextContent(/초과 과금/)
  })

  it('turns the diagnosis result into large role work screens and an AI team process view', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))

    expect(screen.getByRole('heading', { name: /공통 진단 결과/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /역할별 판단/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /결정 기록/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /리포트 미리보기/ })).not.toBeInTheDocument()

    clickDemoScene(/역할별 판단/)

    expect(screen.queryByRole('heading', { name: /공통 진단 결과/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /역할별 판단/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '개발자' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'PM' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'CEO' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'CEO' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('role-workspace-panel')).toHaveTextContent(/CEO 업무 화면/)

    fireEvent.click(screen.getByRole('tab', { name: 'CEO' }))
    const ceoPanel = screen.getByTestId('role-workspace-panel')
    expect(ceoPanel).toHaveTextContent(/지금 얼마가 새고, 어떤 정책 결정을 해야 하나/)
    expect(ceoPanel).toHaveTextContent(/이번 달 미회수 AI 비용/)
    expect(ceoPanel).toHaveTextContent(/가장 손해 보는 고객/)
    expect(ceoPanel).toHaveTextContent(/추천 정책/)
    expect(ceoPanel).toHaveTextContent(/리포트 생성/)
    expect(ceoPanel).toHaveTextContent(/다음 달 검산/)

    fireEvent.click(screen.getByRole('tab', { name: 'PM' }))
    const pmPanel = screen.getByTestId('role-workspace-panel')
    expect(pmPanel).toHaveTextContent(/어떤 기능의 제공 방식이나 가격을 바꿔야 하나/)
    expect(pmPanel).toHaveTextContent(/비용을 태우는 기능/)
    expect(pmPanel).toHaveTextContent(/영향 고객\/요금제/)
    expect(pmPanel).toHaveTextContent(/고객에게 설명할 문장/)

    fireEvent.click(screen.getByRole('tab', { name: '개발자' }))
    const developerPanel = screen.getByTestId('role-workspace-panel')
    expect(developerPanel).toHaveTextContent(/어떤 모델\/세션\/실행 패턴 때문에 비용이 터졌나/)
    expect(developerPanel).toHaveTextContent(/고비용 모델/)
    expect(developerPanel).toHaveTextContent(/비용이 튄 세션/)
    expect(developerPanel).toHaveTextContent(/비용이 튄 실행 기록/)
    expect(developerPanel).toHaveTextContent(/claude-sonnet-4\.6/)
    expect(developerPanel).toHaveTextContent(/sess_001/)
    expect(developerPanel).toHaveTextContent(/run_001/)
    expect(developerPanel).toHaveTextContent(/실패\/재시도 낭비 비용/)
    expect(developerPanel).toHaveTextContent(/저렴한 모델 후보/)
    expect(developerPanel).toHaveTextContent(/출력 길이 제한/)
    expect(developerPanel).toHaveTextContent(/캐시 검토/)
    expect(developerPanel).toHaveTextContent(/모델 교체 검토/)

    clickDemoScene(/AI 팀 작업 과정/)
    const process = screen.getByTestId('ai-team-process-view')
    expect(process).toHaveTextContent(/결정론 미리보기/)
    expect(process).toHaveTextContent(/같은 진단 snapshot/)
    expect(process).toHaveTextContent(/설계/)
    expect(process).toHaveTextContent(/비용 계산/)
    expect(process).toHaveTextContent(/병목 찾기/)
    expect(process).toHaveTextContent(/개선안과 위험 검토/)
    expect(process).toHaveTextContent(/결정 기록/)
  })

  it('loads a demo sample with enough rows to expose customer, feature, model, session, and agent-run patterns', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))
    clickDemoScene(/진단하기/)

    const usageCsvInput = screen.getByLabelText(/사용량 CSV/i) as HTMLTextAreaElement
    const dataRows = usageCsvInput.value.split(/\r?\n/).filter(Boolean).slice(1)
    expect(dataRows.length).toBeGreaterThanOrEqual(12)
    expect(usageCsvInput.value).toContain('customer_name')
    expect(usageCsvInput.value).toContain('Northstar Health')
    expect(usageCsvInput.value).toContain('northstar_health')
    expect(usageCsvInput.value).toContain('agent_workflow')
    expect(usageCsvInput.value).toContain('claude-sonnet-4.6')
    expect(usageCsvInput.value).toContain('sess_001')
    expect(usageCsvInput.value).toContain('run_001')
    expect(usageCsvInput.value).toMatch(/retry|failed/)
  })

  it('calculates the token leak story from pasted CSV values instead of AgentPayroll fixture values', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: {
        value: [
          'timestamp,request_id,customer_id,feature,model,input_tokens,output_tokens,total_cost,latency_ms,status',
          '2026-05-01T10:00:00Z,req_custom_1,cus_delta,contract_review,claude-sonnet-4.6,200000,100000,90,1800,success',
          '2026-05-01T10:04:00Z,req_custom_2,cus_delta,invoice_bot,claude-sonnet-4.6,50000,25000,15,1100,success',
          '2026-05-01T10:08:00Z,req_custom_3,cus_echo,summary,claude-sonnet-4.6,40000,20000,8,900,success',
        ].join('\n'),
      },
    })
    fireEvent.change(screen.getByLabelText(/요금제\/매출 CSV/i), {
      target: {
        value: [
          'customer_id,revenue_collected,included_tokens,overage_rate_usd_per_1k_tokens',
          'cus_delta,40,120000,0.25',
          'cus_echo,99,100000,0.10',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getByTestId('diagnosis-calculation-basis')).toHaveTextContent(/현재 입력 CSV/)
    expect(screen.getAllByText(/cus_delta/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/회수된 매출은 \$40/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/AI 토큰 원가는 \$105/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/미회수 AI 원가 \$65/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/contract_review/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/전체 AI 비용의 80%/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/매핑된 요금제 매출 대비 65%/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/예상 회수 후보: \$65/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/cust_001|\$149|report_generation/)).not.toBeInTheDocument()

    recordDecision(/포함 토큰 \+ 초과 과금 정책 후보/, /보류/)
    clickDemoScene(/리포트 보기/)

    const preview = screen.getByTestId('local-report-preview')
    expect(preview).toHaveTextContent(/AI 비용 누수 리포트/)
    expect(preview).toHaveTextContent(/cus_delta/)
    expect(preview).toHaveTextContent(/\$65/)
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
    expect(panel).toHaveTextContent(/AI 비용 누수 리포트/)

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

  it('records service validation ledger verdicts in expert mode only', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

    const panel = screen.getByTestId('service-validation-ledger-panel')
    expect(panel).toHaveTextContent(/Service validation ledger/i)
    expect(panel).toHaveTextContent(/verdict: fail/i)

    fireEvent.change(screen.getByLabelText(/accepted price KRW/i), { target: { value: '500000' } })
    fireEvent.change(screen.getByLabelText(/repeat report request/i), { target: { value: 'monthly' } })
    fireEvent.click(screen.getByRole('button', { name: /Add lead to ledger/i }))

    expect(panel).toHaveTextContent(/lead-001 \/ pass/i)
    expect(panel).toHaveTextContent(/repeat monthly/i)
    expect(panel).toHaveTextContent(/weekly pass: 1/i)
    expect(panel).toHaveTextContent(/repeat requests: 1/i)
  })

  it('persists multiple service validation leads and accumulates weekly summary', () => {
    const { unmount } = render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

    const panel = screen.getByTestId('service-validation-ledger-panel')
    fireEvent.change(screen.getByLabelText(/accepted price KRW/i), { target: { value: '500000' } })
    fireEvent.change(screen.getByLabelText(/repeat report request/i), { target: { value: 'monthly' } })
    fireEvent.click(screen.getByRole('button', { name: /Add lead to ledger/i }))

    fireEvent.change(screen.getByLabelText(/accepted price KRW/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/dominant request type/i), { target: { value: 'data_readiness' } })
    fireEvent.click(screen.getByRole('button', { name: /Add lead to ledger/i }))

    expect(panel).toHaveTextContent(/saved leads: 2/i)
    expect(panel).toHaveTextContent(/weekly pass: 1/i)
    expect(panel).toHaveTextContent(/fail: 1/i)
    expect(panel).toHaveTextContent(/paid reports: 1/i)
    expect(panel).toHaveTextContent(/repeat requests: 1/i)
    expect(panel).toHaveTextContent(/price decision intents: 2/i)
    expect(panel).toHaveTextContent(/lead-001/i)
    expect(panel).toHaveTextContent(/lead-002/i)

    unmount()
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

    const restoredPanel = screen.getByTestId('service-validation-ledger-panel')
    expect(restoredPanel).toHaveTextContent(/saved leads: 2/i)
    expect(restoredPanel).toHaveTextContent(/weekly pass: 1/i)
    expect(restoredPanel).toHaveTextContent(/paid reports: 1/i)
    expect(restoredPanel).toHaveTextContent(/lead-001/i)
    expect(restoredPanel).toHaveTextContent(/lead-002/i)
  })

  it('keeps service validation ledger hidden from the customer surface', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    expect(screen.queryByTestId('service-validation-ledger-panel')).not.toBeInTheDocument()
    expect(screen.queryByText(/Service validation ledger/i)).not.toBeInTheDocument()
  })

  it('updates the diagnosis preview when CSV state changes', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: { value: csvFor('rag_chat', 42) },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    expect(screen.getByRole('heading', { name: /비용 누수 분석 완료/ })).toBeInTheDocument()
    expect(screen.getAllByText(/손해 고객/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/마진을 깨는 기능/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/토큰 정책 후보/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/rag_chat/).length).toBeGreaterThan(0)

    clickDemoScene(/진단하기/)
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
    fireEvent.change(screen.getByLabelText(/요금제\/매출 CSV/i), {
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
    clickDemoScene(/리포트 보기/)
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
    fireEvent.change(screen.getByLabelText(/요금제\/매출 CSV/i), {
      target: {
        value: [
          'customer_id,revenue_collected,included_tokens',
          'unrelated_customer,500,10000',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    clickDemoScene(/리포트 보기/)
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
    fireEvent.change(screen.getByLabelText(/요금제\/매출 CSV/i), {
      target: {
        value: [
          'customer_id,revenue_collected,included_tokens',
          'cus_loss,,10000',
        ].join('\n'),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))

    clickDemoScene(/리포트 보기/)
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

    fireEvent.click(screen.getByRole('button', { name: /요약 JSON/ }))
    fireEvent.change(screen.getByLabelText(/구조화 summary JSON/i), {
      target: { value: '{"requestCount":1,"rows":[]}' },
    })
    fireEvent.click(screen.getByRole('button', { name: /요약 진단/ }))

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

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))
    expect(screen.queryByRole('link', { name: /PDF 리포트 다운로드/ })).not.toBeInTheDocument()

    recordDecision(/포함 토큰 \+ 초과 과금 정책 후보/, /보류/)
    clickDemoScene(/리포트 보기/)
    expect(screen.getByTestId('local-report-preview')).toHaveTextContent(/AI 비용 누수 리포트/)
    fireEvent.click(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))!)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /PDF 리포트 다운로드/ })).toHaveAttribute(
        'href',
        '/api/reports/report-run-2026-05/download?artifactId=report-artifact:report-run-2026-05:pdf',
      )
    })
    expect(fetcher).toHaveBeenCalledWith('/api/reports', expect.objectContaining({ method: 'POST' }))
  })

  it('keeps the local report preview visible when report storage is not configured', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/usage/import')) {
        return new Response(JSON.stringify({ snapshotRef: 'usage:p1:workspace-demo:2026-05' }), { status: 202 })
      }
      if (url.includes('/api/reports')) {
        return new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
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

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))
    recordDecision(/포함 토큰 \+ 초과 과금 정책 후보/, /보류/)
    clickDemoScene(/리포트 보기/)

    expect(screen.getByTestId('local-report-preview')).toHaveTextContent(/AI 비용 누수 리포트/)
    fireEvent.click(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))!)

    await waitFor(() => expect(screen.getByText(/storage_not_configured/)).toBeInTheDocument())
    expect(screen.getByTestId('local-report-preview')).toHaveTextContent(/AI 비용 누수 리포트/)
    expect(screen.queryByRole('link', { name: /PDF 리포트 다운로드/ })).not.toBeInTheDocument()
  })

  it('keeps customer evidence details free of internal refs after reveal', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))

    expect(screen.queryByText(/tool:diagnosis/)).not.toBeInTheDocument()
    expect(screen.queryByText(/source:|evidence:|Watchtower|RAG evidence|agent route/i)).not.toBeInTheDocument()

    clickDemoScene(/리포트 보기/)
    fireEvent.click(screen.getByRole('button', { name: /근거 보기/ }))

    expect(screen.getByText(/고객별 포함 토큰과 매출 매핑/)).toBeInTheDocument()
    expect(screen.getByText(/결정 후보 계산/)).toBeInTheDocument()
    expect(screen.queryByText(/tool:diagnosis|usage:p1|source:|evidence:|Watchtower|RAG evidence|agent route|artifact|PDF gate|mapping_gap/i)).not.toBeInTheDocument()
  })

  it('requires explicit 채택 거절 or 보류 before creating a PDF report', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))

    clickDemoScene(/리포트 보기/)
    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/결정 후보를 먼저 선택하세요/)
    expect(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))).toBeUndefined()

    clickDemoScene(/결정 기록/)
    expect(screen.getByText(/채택\/보류\/거절 선택이 필요합니다/)).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(/포함 토큰 \+ 초과 과금 정책 후보/))

    clickDemoScene(/리포트 보기/)
    expect(screen.getByTestId('pdf-disabled-reason')).toHaveTextContent(/채택\/보류\/거절 선택이 필요합니다/)
    clickDemoScene(/결정 기록/)
    fireEvent.click(screen.getByRole('button', { name: /채택/ }))
    clickDemoScene(/리포트 보기/)
    expect(screen.getByTestId('local-report-preview')).toHaveTextContent(/채택/)

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

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))
    recordDecision(/포함 토큰 \+ 초과 과금 정책 후보/, /보류/)
    clickDemoScene(/리포트 보기/)

    expect(screen.getByTestId('local-report-preview')).toBeInTheDocument()

    clickDemoScene(/진단하기/)
    fireEvent.click(screen.getByRole('button', { name: /Langfuse 사용량/ }))

    expect(screen.queryByTestId('local-report-preview')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))).toBeUndefined()
  })

  it('connects unit economics PDCA instrumentation to the visible report workflow', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" audience="expert" />)

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))

    clickDemoScene(/진단하기/)
    const pdcaPanel = screen.getByTestId('unit-economics-pdca-panel')
    expect(pdcaPanel).toHaveTextContent(/Unit economics PDCA/i)
    expect(pdcaPanel).toHaveTextContent(/monthly_review_blocked/i)
    expect(pdcaPanel).toHaveTextContent(/decision_required/i)

    fireEvent.change(within(pdcaPanel).getByLabelText(/LLM\/API/i), { target: { value: '240000' } })
    fireEvent.change(within(pdcaPanel).getByLabelText(/토큰 정책 결정 긴급도/i), { target: { value: 'pricing_or_margin_now' } })
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

    recordDecision(/포함 토큰 \+ 초과 과금 정책 후보/, /보류/)
    clickDemoScene(/진단하기/)
    fireEvent.change(screen.getByLabelText(/다음 리뷰 날짜/i), { target: { value: '2026-06-26' } })

    const updatedPdcaPanel = screen.getByTestId('unit-economics-pdca-panel')
    expect(updatedPdcaPanel).toHaveTextContent(/monthly_review_blocked/i)
    expect(updatedPdcaPanel).toHaveTextContent(/persisted_report_artifact_required/i)
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

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))
    recordDecision(/포함 토큰 \+ 초과 과금 정책 후보/, /채택/)
    clickDemoScene(/리포트 보기/)
    fireEvent.click(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))!)

    await waitFor(() => expect(screen.getByRole('link', { name: /PDF 리포트 다운로드/ })).toBeInTheDocument())

    clickDemoScene(/진단하기/)
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

    fireEvent.click(screen.getByRole('button', { name: /샘플 데이터로 진단하기/ }))
    clickDemoScene(/진단하기/)
    fireEvent.change(screen.getByLabelText(/사용량 CSV/i), {
      target: { value: csvFor('agent_workflow', 77) },
    })
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/ }))
    clickDemoScene(/리포트 보기/)
    fireEvent.click(screen.getByRole('button', { name: /근거 보기/ }))

    await waitFor(() => expect(screen.getByText('usage:p1:newer-run')).toBeInTheDocument())

    await act(async () => {
      resolveFirstImport(new Response(JSON.stringify({ snapshotRef: 'usage:p1:older-run' }), { status: 202 }))
      await firstImport
    })

    expect(screen.queryByText('usage:p1:older-run')).not.toBeInTheDocument()
  })
})
