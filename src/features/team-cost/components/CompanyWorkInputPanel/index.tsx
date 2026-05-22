import { Badge, Field, Surface } from '../../../../shared/ui/primitives'
import { fmtCurrency } from '../../../../lib/format'

export interface WorkCatalogItem {
  id: string
  label: string
  frequencyLabel: string
  monthlyVolume: number
  enabled: boolean
}

interface CompanyWorkInputPanelProps {
  companyType: string
  stage: string
  monthlyBudgetUsd: number
  workItems: WorkCatalogItem[]
  onCompanyTypeChange: (value: string) => void
  onStageChange: (value: string) => void
  onMonthlyBudgetUsdChange: (value: number) => void
  onWorkItemEnabledChange: (workItemId: string, enabled: boolean) => void
  onWorkItemMonthlyVolumeChange: (workItemId: string, monthlyVolume: number) => void
}

export function CompanyWorkInputPanel({
  companyType,
  stage,
  monthlyBudgetUsd,
  workItems,
  onCompanyTypeChange,
  onStageChange,
  onMonthlyBudgetUsdChange,
  onWorkItemEnabledChange,
  onWorkItemMonthlyVolumeChange,
}: CompanyWorkInputPanelProps) {
  const enabledCount = workItems.filter(item => item.enabled).length

  return (
    <Surface
      eyebrow="Pre-flight setup"
      title="1. 회사 & 업무 입력"
      description="실제 usage log가 없어도 회사 단계, 월 예산, 업무 빈도 가정으로 AI 팀 비용을 먼저 설계합니다."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-wds border border-line-neutral p-3">
          <Field label="Company type" htmlFor="team-cost-company-type">
            <input
              id="team-cost-company-type"
              value={companyType}
              onChange={event => onCompanyTypeChange(event.target.value)}
              className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
            />
          </Field>
        </div>
        <div className="rounded-wds border border-line-neutral p-3">
          <Field label="Stage" htmlFor="team-cost-stage">
            <input
              id="team-cost-stage"
              value={stage}
              onChange={event => onStageChange(event.target.value)}
              className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
            />
          </Field>
        </div>
        <div className="rounded-wds border border-line-neutral p-3">
          <Field label="Monthly AI team budget" htmlFor="team-cost-budget">
            <input
              id="team-cost-budget"
              type="number"
              min={0}
              value={monthlyBudgetUsd}
              onChange={event => onMonthlyBudgetUsdChange(Number(event.target.value))}
              className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
            />
          </Field>
          <p className="mt-2 text-xs text-label-alternative" translate="no">{fmtCurrency(monthlyBudgetUsd)}</p>
        </div>
      </div>
      <div className="mt-4 rounded-wds border border-line-neutral p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Work catalog</h3>
          <Badge tone="primary">{enabledCount} selected tasks</Badge>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {workItems.map(item => (
            <div key={item.id} className="grid gap-2 rounded-wds border border-line-neutral bg-fill-alternative p-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-label-normal">
                <input
                  type="checkbox"
                  aria-label={`Select ${item.label}`}
                  checked={item.enabled}
                  onChange={event => onWorkItemEnabledChange(item.id, event.target.checked)}
                  className="h-4 w-4 rounded border-line-neutral"
                />
                {item.label}
              </label>
              <Field label={item.frequencyLabel} htmlFor={`work-frequency-${item.id}`}>
                <input
                  id={`work-frequency-${item.id}`}
                  type="number"
                  min={0}
                  value={item.monthlyVolume}
                  onChange={event => onWorkItemMonthlyVolumeChange(item.id, Number(event.target.value))}
                  className="h-9 w-full rounded-wds border border-line-neutral bg-surface-normal px-3 text-sm"
                />
              </Field>
            </div>
          ))}
        </div>
      </div>
    </Surface>
  )
}
