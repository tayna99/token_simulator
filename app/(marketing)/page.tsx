import Link from 'next/link'

export default function MarketingPage() {
  const resultCards = [
    ['손해 고객 찾기', '매출보다 AI 토큰 원가가 큰 고객을 먼저 보여줍니다.'],
    ['마진을 깨는 기능 찾기', '기능별 비용을 요금제 매출과 연결해 어느 기능이 마진을 깎는지 보여줍니다.'],
    ['토큰 정책 후보 만들기', '포함 토큰, 초과 과금, cap 중 지금 검토할 변경안을 제안합니다.'],
  ]
  const serviceSteps = ['이번 달 진단', '결정하기', '공유 리포트', '다음 달 검산']

  return (
    <main className="min-h-screen bg-surface-normal text-label-normal">
      <header className="border-b border-line-neutral bg-surface-normal">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/" className="text-sm font-semibold text-label-normal">
            AgentPayroll
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-label-neutral md:flex" aria-label="서비스 메뉴">
            <a href="#diagnosis">진단하기</a>
            <a href="#report">리포트 보기</a>
            <a href="#review">다음 달 검산</a>
          </nav>
          <Link className="rounded-wds bg-primary-normal px-4 py-2 text-sm font-semibold text-white" href="/w/demo">
            데모 열기
          </Link>
        </div>
      </header>

      <section id="diagnosis" className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-primary-normal">AgentPayroll</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">
            AI 기능 때문에 손해 보는 고객과 기능을 찾습니다
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-label-neutral">
            사용량 CSV와 요금제/매출 CSV만 넣으면 이번 달 AI 토큰 원가가 어디서 새는지 확인하고,
            바꿀 정책을 결정한 뒤 공유용 리포트로 남깁니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-wds bg-primary-normal px-4 py-2 text-sm font-semibold text-white" href="/w/demo?sample=1">
              샘플 데이터로 진단하기
            </Link>
            <Link className="rounded-wds border border-line-neutral px-4 py-2 text-sm font-semibold text-label-normal" href="/w/demo">
              사용량 CSV 올리기
            </Link>
            <Link className="rounded-wds border border-line-neutral px-4 py-2 text-sm font-semibold text-label-normal" href="/w/demo">
              요금제/매출 CSV 올리기
            </Link>
          </div>
          <p className="mt-5 text-sm text-label-alternative">
            고객 ID, 기능명, 모델명, 토큰 수, AI 원가, 매출/포함 토큰만으로 리포트 준비 상태를 확인합니다.
            프롬프트 원문과 비밀키는 입력에서 제외됩니다.
          </p>
        </div>

        <div className="rounded-wds border border-line-neutral bg-surface-alternative p-4">
          <p className="text-sm font-semibold">서비스 흐름</p>
          <div className="mt-4 grid gap-2">
            {serviceSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-wds border border-line-neutral bg-surface-normal p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-normal text-xs font-semibold text-white" translate="no">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="report" className="bg-surface-alternative px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-3 md:grid-cols-3">
            {resultCards.map(([title, body]) => (
              <div key={title} className="rounded-wds border border-line-neutral bg-surface-normal p-4">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-2 text-sm leading-6 text-label-neutral">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="review" className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-wds border border-line-neutral bg-surface-normal p-5">
          <p className="text-sm font-semibold">반복 서비스</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-label-neutral">
            이번 달에는 어디서 돈이 새는지 찾고, 다음 달에는 지난 결정이 실제로 비용을 줄였는지 확인합니다.
            첫 데모에서는 진단하기, 결정하기, 리포트 보기에 집중합니다.
          </p>
        </div>
      </section>
    </main>
  )
}
