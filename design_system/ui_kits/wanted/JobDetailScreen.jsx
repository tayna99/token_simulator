// ui_kits/wanted/JobDetailScreen.jsx
const JobDetailScreen = ({ job, onApply, onBack, bookmarked, onToggleBookmark }) => (
  <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 32px 120px' }}>
    <button onClick={onBack} style={{ background: 'transparent', border: 0, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--semantic-label-neutral)',
      fontSize: 13, fontFamily: 'inherit', padding: '8px 0 16px' }}>
      <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow-right" size={14}/></span>
      목록으로
    </button>

    <div style={{ aspectRatio: '5 / 2', borderRadius: 16,
      background: `linear-gradient(135deg, ${job.heroFrom}, ${job.heroTo})`,
      display: 'flex', alignItems: 'flex-end', padding: 28, color: '#fff' }}>
      <div>
        <div style={{ opacity: .8, fontSize: 14, fontWeight: 500 }}>{job.company}</div>
        <div className="t-display3" style={{ marginTop: 4, color: '#fff' }}>{job.title}</div>
      </div>
    </div>

    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 20 }}>
      <Badge tone="primary">채용중</Badge>
      <Badge tone="redOrange">합격 보너스 {job.bonus.toLocaleString()}원</Badge>
      <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
        <IconButton name={bookmarked ? 'bookmark-fill' : 'bookmark'} onClick={onToggleBookmark} />
        <IconButton name="bubble" />
      </span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 40, marginTop: 32 }}>
      <article>
        <h2 className="t-heading1" style={{ margin: '0 0 12px' }}>주요 업무</h2>
        <p className="t-body1r" style={{ color: 'var(--semantic-label-neutral)' }}>
          • React / Next.js 기반 서비스 개발 및 유지보수<br/>
          • 디자인 시스템과 협업하여 일관된 UI 구현<br/>
          • 주니어 엔지니어 코드 리뷰 및 멘토링<br/>
          • 성능 최적화, 접근성 개선
        </p>
        <h2 className="t-heading1" style={{ margin: '32px 0 12px' }}>자격 요건</h2>
        <p className="t-body1r" style={{ color: 'var(--semantic-label-neutral)' }}>
          • 웹 프론트엔드 경력 3년 이상<br/>
          • TypeScript에 능숙하신 분<br/>
          • 협업과 코드 리뷰 문화에 익숙하신 분
        </p>
        <h2 className="t-heading1" style={{ margin: '32px 0 12px' }}>혜택 및 복지</h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['주 4.5일제', '재택근무', '도서/세미나 지원', '점심 제공', '맥북 지급', '스톡옵션'].map(b =>
            <Chip key={b} size="small">{b}</Chip>
          )}
        </div>
      </article>

      <aside style={{ position: 'sticky', top: 88, alignSelf: 'flex-start',
        border: '1px solid var(--semantic-line-normal-neutral)', borderRadius: 16, padding: 20 }}>
        <CompanyLogo name={job.company} hue={job.hue} />
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>{job.company}</div>
        <div style={{ fontSize: 13, color: 'var(--semantic-label-alternative)', marginTop: 4 }}>{job.location}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '16px 0',
          padding: '14px 0', borderTop: '1px solid var(--semantic-line-normal-alternative)',
          borderBottom: '1px solid var(--semantic-line-normal-alternative)' }}>
          <div><div style={{ fontSize: 11, color: 'var(--semantic-label-alternative)' }}>경력</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{job.years}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--semantic-label-alternative)' }}>마감</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>D-12</div></div>
        </div>
        <Button fullWidth size="large" onClick={onApply} trailingIcon="arrow-right">지원하기</Button>
      </aside>
    </div>
  </main>
);

window.JobDetailScreen = JobDetailScreen;
