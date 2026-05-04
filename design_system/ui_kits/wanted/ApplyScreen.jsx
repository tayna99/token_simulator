// ui_kits/wanted/ApplyScreen.jsx
const ApplyScreen = ({ job, onClose, onSubmit, submitted }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'var(--semantic-material-dimmer)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
    <div style={{ background: '#fff', borderRadius: 20, width: 480, maxWidth: '100%',
      boxShadow: 'var(--shadow-xlarge)', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--semantic-line-normal-alternative)' }}>
        <div className="t-heading2">{submitted ? '지원이 완료되었어요' : '지원하기'}</div>
        <IconButton name="close" onClick={onClose} ariaLabel="close" />
      </div>

      {submitted ? (
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, margin: '0 auto 14px',
            background: 'rgba(0,191,64,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={28} />
          </div>
          <div className="t-body1" style={{ color: 'var(--semantic-label-neutral)' }}>
            {job.company}에서 평균 2일 내 응답이 와요.
          </div>
          <div style={{ marginTop: 24 }}>
            <Button fullWidth size="large" onClick={onClose}>확인</Button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ background: 'var(--semantic-background-normal-alternative)',
            borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <CompanyLogo name={job.company} hue={job.hue} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--semantic-label-alternative)' }}>{job.company}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{job.title}</div>
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--semantic-label-neutral)' }}>이력서 선택</div>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--semantic-fill-alternative)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14 }}>홍길동_프론트엔드_2026.pdf</span>
              <Icon name="attachment" size={16} />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--semantic-label-neutral)' }}>자기소개 (선택)</div>
            <textarea rows="3" placeholder="채용 담당자에게 한마디"
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14,
                padding: '10px 14px', borderRadius: 10, border: 0,
                background: 'var(--semantic-fill-alternative)', resize: 'vertical', outline: 'none' }}/>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Button variant="outlined" color="assistive" fullWidth onClick={onClose}>취소</Button>
            <Button fullWidth onClick={onSubmit}>지원하기</Button>
          </div>
        </div>
      )}
    </div>
  </div>
);

window.ApplyScreen = ApplyScreen;
