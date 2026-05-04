// ui_kits/wanted/HomeScreen.jsx
const JOBS = [
  { id: 'j1', company: '네이버',   title: '프론트엔드 엔지니어 (React/Next)', location: '서울 분당',  years: '경력 3년+', bonus: 1500000, hue: 0, heroFrom: '#0066FF', heroTo: '#00AEFF' },
  { id: 'j2', company: '카카오',   title: 'Senior Backend Engineer',          location: '판교',       years: '경력 5년+', bonus: 2000000, hue: 1, heroFrom: '#6541F2', heroTo: '#CB59FF' },
  { id: 'j3', company: '토스',     title: 'iOS Engineer',                     location: '서울 역삼',  years: '경력 무관', bonus: 1000000, hue: 2, heroFrom: '#FF5E00', heroTo: '#FF9200' },
  { id: 'j4', company: '쿠팡',     title: 'Data Engineer',                    location: '서울 송파',  years: '경력 3년+', bonus: 1200000, hue: 3, heroFrom: '#00BF40', heroTo: '#58CF04' },
  { id: 'j5', company: '당근',     title: 'Product Designer',                  location: 'Remote',     years: '경력 4년+', bonus: 800000,  hue: 4, heroFrom: '#E846CD', heroTo: '#F553DA' },
  { id: 'j6', company: '라인',     title: 'ML Engineer',                       location: '판교',       years: '경력 3년+', bonus: 1500000, hue: 5, heroFrom: '#0098B2', heroTo: '#00BDDE' },
];
const FILTERS = ['전체', '개발', '디자인', '데이터', '경영·비즈니스', 'PM', '마케팅', 'HR'];

const HomeScreen = ({ onOpenJob, bookmarks, toggleBookmark }) => {
  const [filter, setFilter] = React.useState('전체');
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px 80px' }}>
      <section style={{ padding: '24px 0 32px' }}>
        <h1 className="t-title1" style={{ margin: 0, color: 'var(--semantic-label-normal)' }}>
          이력서 한 번으로<br/>여러 회사에 지원하세요.
        </h1>
        <p className="t-body1r" style={{ marginTop: 12, color: 'var(--semantic-label-neutral)' }}>
          합격하면 최대 200만원 보너스를 받을 수 있어요.
        </p>
        <div style={{ marginTop: 20, display: 'flex', gap: 8, alignItems: 'center',
          background: '#fff', border: '1px solid var(--semantic-line-normal-neutral)',
          borderRadius: 12, padding: '4px 4px 4px 16px', maxWidth: 560,
          boxShadow: 'var(--shadow-small)' }}>
          <Icon name="search" size={20} />
          <input placeholder="회사, 직군, 키워드 검색"
            style={{ flex: 1, border: 0, outline: 0, fontFamily: 'inherit', fontSize: 15,
              padding: '10px 4px', background: 'transparent' }} />
          <Button size="medium">검색</Button>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0 20px',
        borderBottom: '1px solid var(--semantic-line-normal-neutral)', marginBottom: 24 }}>
        {FILTERS.map(f => (
          <Chip key={f} active={f === filter} onClick={() => setFilter(f)}>{f}</Chip>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h2 className="t-title3" style={{ margin: 0 }}>지금 뜨는 포지션</h2>
        <a style={{ fontSize: 13, color: 'var(--semantic-label-alternative)', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          전체 보기 <Icon name="arrow-right" size={14} />
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {JOBS.map(job => (
          <JobCard key={job.id} job={job}
            bookmarked={bookmarks[job.id]}
            onToggleBookmark={() => toggleBookmark(job.id)}
            onOpen={() => onOpenJob(job)} />
        ))}
      </div>
    </main>
  );
};

window.HomeScreen = HomeScreen;
