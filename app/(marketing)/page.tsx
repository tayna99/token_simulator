import Link from 'next/link'

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-surface-normal text-label-normal">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase text-primary-normal">AgentCost Production Demo</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-tight">
          AI SaaS cost, evidence, and agent operations on a production path.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-label-neutral">
          The Next.js frontend is the primary product surface. The demo requires Supabase Auth,
          tenant-scoped production rows, the BFF route handlers, and the Python agent service.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-wds bg-primary-normal px-4 py-2 text-sm font-semibold text-white" href="/login">
            Open production demo
          </Link>
          <Link className="rounded-wds border border-line-neutral px-4 py-2 text-sm font-semibold text-label-normal" href="/reports/demo-report">
            View report route
          </Link>
        </div>
      </section>
    </main>
  )
}
