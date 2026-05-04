// ui_kits/wanted/Components.jsx
// Shared primitives for the Wanted UI kit. All shapes pulled from
// packages/wds/src/components/* (button, chip, typography, etc).

const Icon = ({ name, size = 20, color = 'currentColor', style }) => (
  <img
    src={`../../assets/icons/${name}.svg`}
    width={size}
    height={size}
    alt=""
    style={{ display: 'inline-block', verticalAlign: 'middle', filter: color === 'currentColor' ? undefined : undefined, ...style }}
  />
);

const Button = ({ variant = 'solid', color = 'primary', size = 'medium', leadingIcon, trailingIcon, fullWidth, children, onClick, disabled }) => {
  const base = {
    fontFamily: 'inherit', border: 0, cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: fullWidth ? '100%' : 'fit-content', whiteSpace: 'nowrap',
    transition: 'background-color .2s ease, color .2s ease, box-shadow .2s ease',
  };
  const sizes = {
    small:  { padding: '7px 14px', borderRadius: 8,  fontSize: 13, fontWeight: 600 },
    medium: { padding: '9px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600 },
    large:  { padding: '12px 28px',borderRadius: 12, fontSize: 16, fontWeight: 700, letterSpacing: '0.0057em' },
  };
  let palette;
  if (disabled) {
    palette = { background: 'var(--semantic-interaction-disable)', color: 'var(--semantic-label-assistive)' };
  } else if (variant === 'solid' && color === 'primary') {
    palette = { background: 'var(--semantic-primary-normal)', color: '#fff' };
  } else if (variant === 'solid' && color === 'assistive') {
    palette = { background: 'var(--semantic-fill-normal)', color: 'var(--semantic-label-neutral)', backdropFilter: 'blur(32px)' };
  } else if (variant === 'outlined' && color === 'primary') {
    palette = { background: 'transparent', color: 'var(--semantic-primary-normal)', boxShadow: 'inset 0 0 0 1px var(--semantic-line-normal-neutral)' };
  } else {
    palette = { background: 'transparent', color: 'var(--semantic-label-normal)', boxShadow: 'inset 0 0 0 1px var(--semantic-line-normal-neutral)' };
  }
  return (
    <button onClick={disabled ? undefined : onClick} aria-disabled={disabled} style={{ ...base, ...sizes[size], ...palette }}>
      {leadingIcon && <Icon name={leadingIcon} size={sizes[size].fontSize + 4} />}
      <span>{children}</span>
      {trailingIcon && <Icon name={trailingIcon} size={sizes[size].fontSize + 4} />}
    </button>
  );
};

const IconButton = ({ name, size = 20, onClick, ariaLabel }) => (
  <button onClick={onClick} aria-label={ariaLabel} style={{
    background: 'transparent', border: 0, cursor: 'pointer',
    width: size + 16, height: size + 16, borderRadius: 999,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--semantic-label-neutral)', transition: 'background-color .2s',
  }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--semantic-fill-normal)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <Icon name={name} size={size} />
  </button>
);

const Chip = ({ active, onClick, children, size = 'medium', leadingIcon }) => {
  const sizes = {
    small:  { padding: '6px 8px',  borderRadius: 8,  fontSize: 14 },
    medium: { padding: '7px 11px', borderRadius: 8,  fontSize: 15 },
    large:  { padding: '9px 12px', borderRadius: 10, fontSize: 15 },
  };
  return (
    <button onClick={onClick} style={{
      ...sizes[size], fontFamily: 'inherit', fontWeight: 500, border: 0, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: active ? 'var(--semantic-inverse-background)' : 'var(--semantic-fill-alternative)',
      color: active ? 'var(--semantic-inverse-label)' : 'var(--semantic-label-normal)',
      transition: 'all .2s ease', whiteSpace: 'nowrap',
    }}>
      {leadingIcon && <Icon name={leadingIcon} size={14} />}
      <span style={{ padding: '0 2px' }}>{children}</span>
    </button>
  );
};

const Badge = ({ tone = 'primary', children }) => {
  const tones = {
    primary:   { background: 'rgba(0,102,255,.10)', color: '#0054D1' },
    positive:  { background: '#F2FFF6', color: '#006E25' },
    cautionary:{ background: '#FEF4E6', color: '#9C5800' },
    negative:  { background: '#FEECEC', color: '#B00C0C' },
    redOrange: { background: '#FEEEE5', color: '#913500' },
    violet:    { background: '#F0ECFE', color: '#3A16C9' },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500,
      ...tones[tone],
    }}>{children}</span>
  );
};

const CompanyLogo = ({ name, hue = 0 }) => {
  const colors = [
    'linear-gradient(135deg,#0066FF,#00AEFF)',
    'linear-gradient(135deg,#6541F2,#CB59FF)',
    'linear-gradient(135deg,#FF5E00,#FF9200)',
    'linear-gradient(135deg,#00BF40,#58CF04)',
    'linear-gradient(135deg,#E846CD,#F553DA)',
    'linear-gradient(135deg,#0098B2,#00BDDE)',
  ];
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
      background: colors[hue % colors.length],
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: 16,
    }}>{name?.[0] ?? '?'}</div>
  );
};

const JobCard = ({ job, bookmarked, onToggleBookmark, onOpen }) => (
  <div onClick={onOpen} style={{
    background: '#fff', border: '1px solid var(--semantic-line-normal-neutral)',
    borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
    cursor: 'pointer', position: 'relative', transition: 'box-shadow .2s ease, border-color .2s',
  }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-medium)'; e.currentTarget.style.borderColor = 'transparent'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--semantic-line-normal-neutral)'; }}
  >
    <div style={{ position: 'absolute', top: 12, right: 12 }}>
      <IconButton name={bookmarked ? 'bookmark-fill' : 'bookmark'} ariaLabel="Save"
        onClick={(e) => { e.stopPropagation(); onToggleBookmark?.(); }} />
    </div>
    <div style={{ aspectRatio: '16 / 10', borderRadius: 10, background: `linear-gradient(135deg,${job.heroFrom},${job.heroTo})`,
      display: 'flex', alignItems: 'flex-end', padding: 12, color: '#fff', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
      {job.company}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <CompanyLogo name={job.company} hue={job.hue} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--semantic-label-alternative)' }}>{job.company}</div>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
      <span style={{ fontSize: 13, color: 'var(--semantic-label-neutral)' }}>{job.location} · {job.years}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--semantic-primary-normal)' }}>
        보너스 {job.bonus.toLocaleString()}원
      </span>
    </div>
  </div>
);

const TopNav = ({ active, onNavigate, onSearch }) => (
  <header style={{
    position: 'sticky', top: 0, zIndex: 10,
    background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(32px)',
    borderBottom: '1px solid var(--semantic-line-normal-neutral)',
    height: 64, display: 'flex', alignItems: 'center',
    padding: '0 32px', gap: 32,
  }}>
    <a onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
      <img src="../../assets/wanted-wordmark.svg" height="22" alt="wanted" />
    </a>
    <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
      {['채용', '이벤트', '직군별 연봉', '커리어 성장', 'AI 매칭'].map((label, i) => (
        <a key={label} onClick={() => onNavigate(i === 0 ? 'home' : 'home')}
          style={{ padding: '8px 14px', borderRadius: 8, fontSize: 15, fontWeight: 500,
            color: i === 0 && active === 'home' ? 'var(--semantic-label-normal)' : 'var(--semantic-label-alternative)',
            cursor: 'pointer', transition: 'background .2s', }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--semantic-fill-alternative)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >{label}</a>
      ))}
    </nav>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <IconButton name="search" ariaLabel="search" onClick={onSearch} />
      <IconButton name="bell" ariaLabel="notifications" />
      <IconButton name="bookmark" ariaLabel="saved" />
      <div style={{ width: 32, height: 32, borderRadius: 999, marginLeft: 8,
        background: 'linear-gradient(135deg,#6541F2,#0066FF)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>홍</div>
    </div>
  </header>
);

Object.assign(window, { Icon, Button, IconButton, Chip, Badge, CompanyLogo, JobCard, TopNav });
