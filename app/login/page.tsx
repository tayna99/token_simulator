export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface-normal px-6 py-16 text-label-normal">
      <section className="mx-auto max-w-md">
        <p className="text-sm font-semibold uppercase text-primary-normal">Supabase Auth</p>
        <h1 className="mt-3 text-3xl font-semibold">Production demo login</h1>
        <p className="mt-3 text-sm leading-6 text-label-neutral">
          Use the provisioned demo user. This form signs in through the Next.js BFF and Supabase SSR cookie session.
        </p>
        <form action="/api/auth/login" method="post" className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              className="rounded-wds border border-line-neutral bg-surface-alternative px-3 py-2 text-label-normal"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Password
            <input
              className="rounded-wds border border-line-neutral bg-surface-alternative px-3 py-2 text-label-normal"
              name="password"
              required
              type="password"
            />
          </label>
          <button className="rounded-wds bg-primary-normal px-4 py-2 text-sm font-semibold text-white" type="submit">
            Sign in to demo workspace
          </button>
        </form>
      </section>
    </main>
  )
}
