export type Role = 'developer' | 'pm' | 'ceo'

export interface RoleLabels {
  migrationHeading: string
  scenarioHeading: string
  breakdownHeading: string
  budgetHeading: string
  summaryTone: 'technical' | 'product' | 'executive'
  emphasisOrder: Array<'breakdown' | 'budget' | 'migration' | 'scenario'>
}

export const ROLE_PACK: Record<Role, RoleLabels> = {
  developer: {
    migrationHeading: 'Model Swap Cost',
    scenarioHeading: 'Load Scenarios',
    breakdownHeading: 'Per-Request Cost Breakdown',
    budgetHeading: 'Throughput at Budget',
    summaryTone: 'technical',
    emphasisOrder: ['breakdown', 'migration', 'scenario', 'budget'],
  },
  pm: {
    migrationHeading: 'Migration ROI',
    scenarioHeading: 'Best / Base / Worst',
    breakdownHeading: 'Where the Money Goes',
    budgetHeading: 'Users & Requests Supported',
    summaryTone: 'product',
    emphasisOrder: ['migration', 'budget', 'scenario', 'breakdown'],
  },
  ceo: {
    migrationHeading: 'Switch Savings',
    scenarioHeading: 'Exposure Range',
    breakdownHeading: 'Cost Composition',
    budgetHeading: 'Budget Coverage',
    summaryTone: 'executive',
    emphasisOrder: ['migration', 'scenario', 'budget', 'breakdown'],
  },
}

export interface SummaryContext {
  currentModel: string
  candidateModel: string
  monthlyCost: string
  annualCost: string
  switchSavings: string
  switchPct: string
  perRequest: string
  perUser: string
  maxUsers: string
  topDriver: string
}

export function summaryTemplate(tone: RoleLabels['summaryTone'], ctx: SummaryContext): string {
  if (tone === 'technical') {
    return `At current config, 1 request costs ${ctx.perRequest} on ${ctx.currentModel}. ` +
           `Monthly ${ctx.monthlyCost}. ${ctx.topDriver} ` +
           `Switching to ${ctx.candidateModel} changes per-request cost by ${ctx.switchPct}.`
  }
  if (tone === 'executive') {
    return `Spend on ${ctx.currentModel}: ${ctx.monthlyCost}/mo (${ctx.annualCost}/yr). ` +
           `Switching to ${ctx.candidateModel} saves ${ctx.switchSavings} (${ctx.switchPct}) annually. ` +
           `Worst case doubled traffic: exposure grows proportionally. ` +
           `${ctx.topDriver}`
  }
  // product (PM)
  return `At ${ctx.maxUsers} users on ${ctx.currentModel}, monthly cost is ${ctx.monthlyCost} ` +
         `(${ctx.perUser} per user). Switching to ${ctx.candidateModel} would save ${ctx.switchSavings}. ` +
         `${ctx.topDriver}`
}
