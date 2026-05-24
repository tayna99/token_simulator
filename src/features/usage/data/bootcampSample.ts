// Bootcamp validation sample — PLACEHOLDER data for a 6-team bootcamp scenario.
//
// ⚠️  IMPORTANT: Team names (Team A ~ Team F), plan ids, and feature names below
//     are GENERIC PLACEHOLDERS. They are NOT real bootcamp teams. Use this file
//     only for pre-interview demo / sample-report generation.
//
//     After interviews land real team names, project types, and feature lists,
//     swap the entries marked `// SWAP-AFTER-INTERVIEW` below and re-run the
//     app — the deterministic generator will rebuild a new CSV with the same
//     distribution shape but real labels.
//
// What is ALSO placeholder (the data shape, not just the labels):
//   • Risk-band distribution (1 over-budget / 2 warning / 2 healthy / 1 safe)
//     — chosen to demo ALL risk states in one screen, NOT measured from real
//     bootcamp teams.
//   • Time profile (week 1~4 = 10/18/28/44%) — assumes a demo-week crunch.
//     Real bootcamp ramp may be flatter, spikier, or back-loaded differently.
//   • Per-feature weights and heavyModelShare — best guesses.
//   • Model mix per team — assumes 2-model split, but a real team may use 1 or 3+.
//   → These get recalibrated on Day 3 (interview debrief). The current values
//     are demo-friendly but unverified.
//
// What stays mostly stable regardless of interviews:
//   • Schema (13-column CSV matching sparkClawSample.ts).
//   • Deterministic generator (mulberry32, same CSV every run).
//   • Realistic OpenAI 2026-05 prices.
//   • Prompt-free analytics: no `prompt` column. Privacy posture preserved.
//   • Per-team budget ($75 ≈ ₩100,000) — this IS a real bootcamp fact.
//
// Schema matches sparkClawSample.ts and src/features/usage/lib/usageImport.ts.

interface PriceTable {
  inputPerMillion: number
  outputPerMillion: number
}

const MODEL_PRICES: Record<string, PriceTable> = {
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gpt-4o': { inputPerMillion: 2.50, outputPerMillion: 10.00 },
  'gpt-4.1-mini': { inputPerMillion: 0.40, outputPerMillion: 1.60 },
  'gpt-4.1': { inputPerMillion: 2.00, outputPerMillion: 8.00 },
}

interface FeatureSpec {
  feature: string
  /** Average input tokens per call (lognormal mean) */
  inputMean: number
  /** Average output tokens per call (lognormal mean) */
  outputMean: number
  /** Weight in this team's mix (relative) */
  weight: number
  /** Probability of using the heavier model for this feature */
  heavyModelShare: number
}

interface TeamSpec {
  customerId: string
  planId: string
  label: string
  /** Total call volume across the 4-week bootcamp window */
  totalCalls: number
  features: FeatureSpec[]
  /** [heavyModel, cheapModel] — heavyModelShare in each feature picks index 0 */
  models: [string, string]
}

// SWAP-AFTER-INTERVIEW: replace `label`, `customerId`, `planId`, `features[].feature`
// with real values from interviews. Keep `totalCalls`, `weight`, `heavyModelShare`,
// `inputMean`, `outputMean`, `models` unless a team clearly behaves differently.
const BOOTCAMP_TEAMS: TeamSpec[] = [
  {
    // Risk band: WARNING (~82% budget soak)
    customerId: 'team_a',
    planId: 'category-voice',
    label: 'Team A',
    totalCalls: 600,
    models: ['gpt-4o', 'gpt-4o-mini'],
    features: [
      { feature: 'voice_synthesis', inputMean: 2400, outputMean: 900, weight: 0.55, heavyModelShare: 0.35 },
      { feature: 'scoring', inputMean: 600, outputMean: 120, weight: 0.30, heavyModelShare: 0.10 },
      { feature: 'tts_output', inputMean: 1200, outputMean: 400, weight: 0.15, heavyModelShare: 0.25 },
    ],
  },
  {
    // Risk band: OVER-BUDGET (~97%)
    customerId: 'team_b',
    planId: 'category-dialogue',
    label: 'Team B',
    totalCalls: 750,
    models: ['gpt-4.1', 'gpt-4.1-mini'],
    features: [
      { feature: 'dialogue_generation', inputMean: 3800, outputMean: 1600, weight: 0.55, heavyModelShare: 0.70 },
      { feature: 'context_retrieval', inputMean: 2200, outputMean: 700, weight: 0.25, heavyModelShare: 0.50 },
      { feature: 'state_inference', inputMean: 800, outputMean: 240, weight: 0.20, heavyModelShare: 0.40 },
    ],
  },
  {
    // Risk band: HEALTHY (~51%) — shares category-tutor with Team F
    customerId: 'team_c',
    planId: 'category-tutor',
    label: 'Team C',
    totalCalls: 480,
    models: ['gpt-4.1-mini', 'gpt-4o-mini'],
    features: [
      { feature: 'rag_query', inputMean: 3200, outputMean: 500, weight: 0.45, heavyModelShare: 0.85 },
      { feature: 'content_summary', inputMean: 4500, outputMean: 800, weight: 0.30, heavyModelShare: 0.85 },
      { feature: 'quiz_generation', inputMean: 1400, outputMean: 600, weight: 0.25, heavyModelShare: 0.60 },
    ],
  },
  {
    // Risk band: SAFE (~28%)
    customerId: 'team_d',
    planId: 'category-quest',
    label: 'Team D',
    totalCalls: 280,
    models: ['gpt-4o', 'gpt-4o-mini'],
    features: [
      { feature: 'text_generation', inputMean: 1200, outputMean: 800, weight: 0.45, heavyModelShare: 0.15 },
      { feature: 'scene_description', inputMean: 900, outputMean: 700, weight: 0.35, heavyModelShare: 0.10 },
      { feature: 'hint_text', inputMean: 500, outputMean: 200, weight: 0.20, heavyModelShare: 0.05 },
    ],
  },
  {
    // Risk band: WARNING (~74%)
    customerId: 'team_e',
    planId: 'category-analytics',
    label: 'Team E',
    totalCalls: 520,
    models: ['gpt-4o', 'gpt-4o-mini'],
    features: [
      { feature: 'report_generation', inputMean: 5200, outputMean: 2400, weight: 0.50, heavyModelShare: 0.65 },
      { feature: 'feedback_text', inputMean: 1800, outputMean: 800, weight: 0.30, heavyModelShare: 0.45 },
      { feature: 'progress_summary', inputMean: 2400, outputMean: 600, weight: 0.20, heavyModelShare: 0.35 },
    ],
  },
  {
    // Risk band: HEALTHY (~63%) — shares category-tutor with Team C
    customerId: 'team_f',
    planId: 'category-tutor',
    label: 'Team F',
    totalCalls: 620,
    models: ['gpt-4.1-mini', 'gpt-4o-mini'],
    features: [
      { feature: 'multimodal_chat', inputMean: 2200, outputMean: 900, weight: 0.45, heavyModelShare: 0.65 },
      { feature: 'speech_to_text', inputMean: 1400, outputMean: 300, weight: 0.30, heavyModelShare: 0.50 },
      { feature: 'hint_text', inputMean: 600, outputMean: 250, weight: 0.25, heavyModelShare: 0.30 },
    ],
  },
]

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) so the CSV is identical run to run.

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickFeature(team: TeamSpec, rng: () => number): FeatureSpec {
  const total = team.features.reduce((sum, f) => sum + f.weight, 0)
  let roll = rng() * total
  for (const feature of team.features) {
    roll -= feature.weight
    if (roll <= 0) return feature
  }
  return team.features[team.features.length - 1]
}

/** Approximate lognormal sample around `mean` with sigma=0.35. */
function jitter(mean: number, rng: () => number): number {
  const u1 = Math.max(rng(), 1e-6)
  const u2 = rng()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  const lognormal = Math.exp(z * 0.35)
  return Math.max(1, Math.round(mean * lognormal))
}

/** Bootcamp time profile: weeks 1-2 light, week 3 ramp, week 4 demo crunch. */
function pickDayOffset(rng: () => number): number {
  // Weights for week 1, 2, 3, 4 = 0.10, 0.18, 0.28, 0.44
  const buckets = [0.10, 0.18, 0.28, 0.44]
  let roll = rng()
  let weekIdx = 3
  for (let i = 0; i < buckets.length; i += 1) {
    if (roll < buckets[i]) {
      weekIdx = i
      break
    }
    roll -= buckets[i]
  }
  const dayInWeek = Math.floor(rng() * 7)
  return weekIdx * 7 + dayInWeek
}

function formatTimestamp(start: Date, dayOffset: number, callIndex: number): string {
  const date = new Date(start)
  date.setUTCDate(date.getUTCDate() + dayOffset)
  // Spread calls across business hours (UTC 02:00 - 14:00 ≈ KST 11:00 - 23:00).
  const hour = 2 + ((callIndex * 7) % 12)
  const minute = (callIndex * 13) % 60
  date.setUTCHours(hour, minute, (callIndex * 29) % 60, 0)
  return date.toISOString()
}

function buildCsv(): string {
  const header = 'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status'
  const rows: string[] = [header]
  const start = new Date(Date.UTC(2026, 4, 1)) // 2026-05-01 — bootcamp kickoff
  let requestSeq = 1

  for (const team of BOOTCAMP_TEAMS) {
    const rng = mulberry32(hashSeed(team.customerId))
    for (let call = 0; call < team.totalCalls; call += 1) {
      const feature = pickFeature(team, rng)
      const useHeavyModel = rng() < feature.heavyModelShare
      const model = useHeavyModel ? team.models[0] : team.models[1]
      const inputTokens = jitter(feature.inputMean, rng)
      const outputTokens = jitter(feature.outputMean, rng)
      const price = MODEL_PRICES[model]
      const cost = (inputTokens / 1_000_000) * price.inputPerMillion
        + (outputTokens / 1_000_000) * price.outputPerMillion
      const dayOffset = pickDayOffset(rng)
      const timestamp = formatTimestamp(start, dayOffset, call)
      const sessionId = `sess_${team.customerId}_${Math.floor(call / 4) + 1}`
      const agentRunId = `run_${team.customerId}_${call + 1}`
      const status = rng() < 0.97 ? 'success' : 'error'
      const requestId = `req_${String(requestSeq).padStart(5, '0')}`
      requestSeq += 1
      rows.push([
        timestamp,
        requestId,
        team.customerId,
        team.planId,
        feature.feature,
        model,
        sessionId,
        agentRunId,
        inputTokens.toString(),
        outputTokens.toString(),
        cost.toFixed(4),
        Math.round(400 + rng() * 1800).toString(),
        status,
      ].join(','))
    }
  }
  // Sort by timestamp so the import looks like a real chronological log.
  const sorted = [rows[0], ...rows.slice(1).sort((a, b) => a.localeCompare(b))]
  return sorted.join('\n')
}

function hashSeed(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export const BOOTCAMP_SAMPLE_CSV = buildCsv()

/**
 * Marker exposed to the UI so the demo screen can render a watermark
 * ("placeholder data — not real teams") when this sample is loaded.
 */
export const BOOTCAMP_SAMPLE_IS_PLACEHOLDER = true

/**
 * Per-team OpenAI API budget (₩100,000 ≈ $75 USD at 1300 KRW/USD).
 * Used as a "monthly revenue" stand-in so the margin engine produces
 * a budget-soak-rate instead of gross margin. // SWAP-AFTER-INTERVIEW
 */
export const BOOTCAMP_TEAM_BUDGET_USD: Record<string, number> = {
  team_a: 75,
  team_b: 75,
  team_c: 75,
  team_d: 75,
  team_e: 75,
  team_f: 75,
}

/** Plan-level aggregated budget (sum of teams sharing the same plan_id). */
export const BOOTCAMP_PLAN_BUDGET_USD: Record<string, number> = {
  'category-voice': 75,
  'category-dialogue': 75,
  'category-tutor': 150, // Team C + Team F
  'category-quest': 75,
  'category-analytics': 75,
}

/** Human-readable team labels for the bootcamp demo UI. // SWAP-AFTER-INTERVIEW */
export const BOOTCAMP_TEAM_LABELS: Record<string, string> = {
  team_a: 'Team A',
  team_b: 'Team B',
  team_c: 'Team C',
  team_d: 'Team D',
  team_e: 'Team E',
  team_f: 'Team F',
}
