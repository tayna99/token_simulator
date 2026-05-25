import Link from 'next/link'

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-surface-normal text-label-normal">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase text-primary-normal" translate="no">AI SaaS Margin Diagnosis</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-tight">
          AI 기능 때문에 손해 보는 고객을 찾으세요
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-label-neutral">
          OpenAI 비용이 늘었는데 매출은 그대로라면, 어떤 고객과 기능이 마진을 깨는지 찾아드립니다.
          AI 기능이 많이 쓰일수록 손해 보는 고객을 5분 안에 찾습니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-wds bg-primary-normal px-4 py-2 text-sm font-semibold text-white" href="/w/demo">
            사용량 CSV 업로드
          </Link>
          <Link className="rounded-wds border border-line-neutral px-4 py-2 text-sm font-semibold text-label-normal" href="/w/demo">
            Stripe/매출 CSV 업로드
          </Link>
          <Link className="rounded-wds border border-line-neutral px-4 py-2 text-sm font-semibold text-label-normal" href="/w/demo?sample=1">
            샘플로 보기
          </Link>
        </div>
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {[
            ['가장 위험한 비용 누수', 'Pro 고객 12명이 월 AI 비용의 큰 비중을 만들지만 매출 기여는 작습니다.'],
            ['마진을 깨는 기능', 'Support reply 같은 기능이 gross margin을 낮추는지 먼저 보여줍니다.'],
            ['추천 결정', '가격표 변경, usage cap, overage, 모델 라우팅 검토 중 다음 결정을 제안합니다.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-wds border border-line-neutral bg-fill-alternative p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-sm leading-6 text-label-neutral">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
