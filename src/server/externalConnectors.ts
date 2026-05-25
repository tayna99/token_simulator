import type {
  P1ExternalAction,
  P1ExternalConnectorId,
  P1ExternalConnectorMode,
} from '../features/p1/lib/p1OperatingSystem'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface ExternalConnectorPreparedAction {
  connectorId: P1ExternalConnectorId
  action: P1ExternalAction
  url: string
  body: Record<string, unknown>
  rollbackMetadata: Record<string, unknown>
}

export interface ExternalConnectorExecution {
  externalRef: string
  rollbackMetadata: Record<string, unknown>
}

export interface ExternalConnector {
  readonly id: P1ExternalConnectorId
  validateConfig(env: Record<string, string | undefined>): boolean
  prepare(action: P1ExternalAction, env: Record<string, string | undefined>): ExternalConnectorPreparedAction
  execute(
    prepared: ExternalConnectorPreparedAction,
    input: { env: Record<string, string | undefined>; fetcher: FetchLike; idempotencyKey: string; mode: P1ExternalConnectorMode },
  ): Promise<ExternalConnectorExecution>
  rollbackPreview(execution: ExternalConnectorExecution): Record<string, unknown>
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function messagePayload(action: P1ExternalAction): string {
  return text(action.payload.message, action.title)
}

function jsonHeaders(extra?: Record<string, string>): HeadersInit {
  return { 'Content-Type': 'application/json', ...(extra ?? {}) }
}

async function parseConnectorRef(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await response.json() as Record<string, unknown>
    return text(body.id, text(body.externalRef, fallback))
  }
  const raw = await response.text()
  if (raw.trim().startsWith('{')) {
    try {
      const body = JSON.parse(raw) as Record<string, unknown>
      return text(body.id, text(body.externalRef, fallback))
    } catch {
      return raw.trim() ? `${fallback}:${raw.trim()}` : fallback
    }
  }
  return raw.trim() ? `${fallback}:${raw.trim()}` : fallback
}

function rollbackMetadata(action: P1ExternalAction, connectorId: P1ExternalConnectorId): Record<string, unknown> {
  return {
    connectorId,
    actionSnapshot: action.payload,
    rollbackRef: action.rollbackRef ?? (typeof action.payload.rollbackRef === 'string' ? action.payload.rollbackRef : ''),
  }
}

const slackWebhookConnector: ExternalConnector = {
  id: 'slack_webhook',
  validateConfig: env => Boolean(env.SLACK_WEBHOOK_URL),
  prepare(action, env) {
    return {
      connectorId: 'slack_webhook',
      action,
      url: env.SLACK_WEBHOOK_URL ?? '',
      body: { text: messagePayload(action), channel: action.payload.channel },
      rollbackMetadata: rollbackMetadata(action, 'slack_webhook'),
    }
  },
  async execute(prepared, input) {
    const response = await input.fetcher(prepared.url, {
      method: 'POST',
      headers: jsonHeaders({ 'Idempotency-Key': input.idempotencyKey }),
      body: JSON.stringify(prepared.body),
    })
    if (!response.ok) throw new Error(`Slack connector failed with ${response.status}`)
    const externalRef = await parseConnectorRef(response, `slack:${prepared.action.id}`)
    return { externalRef, rollbackMetadata: prepared.rollbackMetadata }
  },
  rollbackPreview: execution => ({ deleteMessageRef: execution.externalRef }),
}

const resendEmailConnector: ExternalConnector = {
  id: 'resend_email',
  validateConfig: env => Boolean(env.RESEND_API_KEY),
  prepare(action) {
    return {
      connectorId: 'resend_email',
      action,
      url: 'https://api.resend.com/emails',
      body: {
        from: text(action.payload.from, 'AgentCost <agentcost@example.com>'),
        to: [text(action.payload.recipient, 'founder@example.com')],
        subject: text(action.payload.subject, action.title),
        text: messagePayload(action),
      },
      rollbackMetadata: rollbackMetadata(action, 'resend_email'),
    }
  },
  async execute(prepared, input) {
    const response = await input.fetcher(prepared.url, {
      method: 'POST',
      headers: jsonHeaders({
        Authorization: `Bearer ${input.env.RESEND_API_KEY}`,
        'Idempotency-Key': input.idempotencyKey,
      }),
      body: JSON.stringify(prepared.body),
    })
    if (!response.ok) throw new Error(`Resend connector failed with ${response.status}`)
    const externalRef = await parseConnectorRef(response, `resend:${prepared.action.id}`)
    return { externalRef, rollbackMetadata: prepared.rollbackMetadata }
  },
  rollbackPreview: execution => ({ cancelEmailRef: execution.externalRef }),
}

function billingBody(action: P1ExternalAction): Record<string, unknown> {
  return {
    policy: action.payload.policy,
    includedCredits: action.payload.includedCredits,
    overagePricePerRequest: action.payload.overagePricePerRequest,
    capUsdPerCustomer: action.payload.capUsdPerCustomer,
    rollbackRef: action.rollbackRef ?? action.payload.rollbackRef,
  }
}

const stripeBillingConnector: ExternalConnector = {
  id: 'stripe_billing',
  validateConfig: env => Boolean(env.STRIPE_SECRET_KEY),
  prepare(action) {
    return {
      connectorId: 'stripe_billing',
      action,
      url: 'https://api.stripe.com/v1/prices',
      body: billingBody(action),
      rollbackMetadata: rollbackMetadata(action, 'stripe_billing'),
    }
  },
  async execute(prepared, input) {
    const response = await input.fetcher(prepared.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.env.STRIPE_SECRET_KEY}`,
        'Idempotency-Key': input.idempotencyKey,
      },
      body: new URLSearchParams(Object.entries(prepared.body).map(([key, value]) => [key, String(value ?? '')])),
    })
    if (!response.ok) throw new Error(`Stripe connector failed with ${response.status}`)
    const externalRef = await parseConnectorRef(response, `stripe:${prepared.action.id}`)
    return { externalRef, rollbackMetadata: prepared.rollbackMetadata }
  },
  rollbackPreview: execution => ({ archiveStripePriceRef: execution.externalRef }),
}

const metronomeConnector: ExternalConnector = {
  id: 'metronome',
  validateConfig: env => Boolean(env.METRONOME_API_KEY),
  prepare(action) {
    return {
      connectorId: 'metronome',
      action,
      url: 'https://api.metronome.com/v1/contracts/rate-cards',
      body: billingBody(action),
      rollbackMetadata: rollbackMetadata(action, 'metronome'),
    }
  },
  async execute(prepared, input) {
    const response = await input.fetcher(prepared.url, {
      method: 'POST',
      headers: jsonHeaders({
        Authorization: `Bearer ${input.env.METRONOME_API_KEY}`,
        'Idempotency-Key': input.idempotencyKey,
      }),
      body: JSON.stringify(prepared.body),
    })
    if (!response.ok) throw new Error(`Metronome connector failed with ${response.status}`)
    const externalRef = await parseConnectorRef(response, `metronome:${prepared.action.id}`)
    return { externalRef, rollbackMetadata: prepared.rollbackMetadata }
  },
  rollbackPreview: execution => ({ archiveMetronomeRateCardRef: execution.externalRef }),
}

export const EXTERNAL_CONNECTORS: Record<P1ExternalConnectorId, ExternalConnector> = {
  slack_webhook: slackWebhookConnector,
  resend_email: resendEmailConnector,
  stripe_billing: stripeBillingConnector,
  metronome: metronomeConnector,
}
