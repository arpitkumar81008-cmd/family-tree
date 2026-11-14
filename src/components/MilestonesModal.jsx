import React, { useEffect, useMemo, useState } from 'react';
import { computeUpcomingMilestones } from '../utils/milestones.js';

export function MilestonesModal({
  isOpen = true,
  onClose,
  people,
  displayName,
  lang = 'en',
  onSelectPerson
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'birthday' | 'anniversary'
  const isHi = lang === 'hi';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = e => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const milestones = useMemo(() => {
    if (!isOpen) return [];
    return computeUpcomingMilestones(people, { limit: 50 });
  }, [isOpen, people]);

  const filtered = useMemo(() => {
    if (filter === 'all') return milestones;
    return milestones.filter(m => m.type === filter);
  }, [milestones, filter]);

  if (!isOpen) return null;

  const getPersonName = person => {
    if (typeof displayName === 'function') return displayName(person.id);
    return isHi ? (person.hi || person.name || person.n || person.id) : (person.name || person.n || person.id);
  };

  const formatCountdown = days => {
    if (days === 0) return isHi ? 'आज!' : 'Today!';
    if (days === 1) return isHi ? 'कल' : 'Tomorrow';
    return isHi ? `${days} दिन में` : `In ${days} days`;
  };

  const formatDate = date => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  const handleSelect = personId => {
    if (typeof onSelectPerson === 'function') {
      onSelectPerson(personId);
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div
      className="overlay"
      onClick={e => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      onMouseDown={e => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestones-title"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <button
          className="x"
          type="button"
          aria-label={isHi ? 'बंद करें' : 'Close'}
          onClick={onClose}
        >
          ×
        </button>

        <h2 id="milestones-title" style={{ marginTop: 0, marginBottom: '6px' }}>
          {isHi ? 'आगामी जन्मदिन एवं वर्षगाँठ' : 'Upcoming Birthdays & Anniversaries'}
        </h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: '14px', fontSize: '13px' }}>
          {isHi
            ? 'किसी भी सदस्य का विवरण देखने के लिए उस पर क्लिक करें।'
            : 'Click any family member to open their profile.'}
        </p>

        <div className="seg" role="group" aria-label={isHi ? 'फ़िल्टर' : 'Filter milestones'} style={{ marginBottom: '14px' }}>
          <button
            type="button"
            className="zbtn"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            {isHi ? 'सभी' : 'All'} ({milestones.length})
          </button>
          <button
            type="button"
            className="zbtn"
            aria-pressed={filter === 'birthday'}
            onClick={() => setFilter('birthday')}
          >
            {isHi ? 'जन्मदिन' : 'Birthdays'}
          </button>
          <button
            type="button"
            className="zbtn"
            aria-pressed={filter === 'anniversary'}
            onClick={() => setFilter('anniversary')}
          >
            {isHi ? 'वर्षगाँठ' : 'Anniversaries'}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              borderRadius: '10px',
              border: '1px dashed var(--line, #d4d4d8)',
              color: 'var(--muted)'
            }}
          >
            <p style={{ margin: 0, fontSize: '14px' }}>
              {isHi
                ? 'कोई आगामी जन्मदिन या वर्षगाँठ नहीं मिली। सदस्य के प्रोफ़ाइल में जन्मतिथि या विवाह तिथि जोड़ें।'
                : 'No upcoming milestones found. Add a Date of Birth or Anniversary in any member’s profile.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '55vh', overflowY: 'auto' }}>
            {filtered.map(m => {
              const name = getPersonName(m.person);
              const isToday = m.daysUntil === 0;
              const isBirthday = m.type === 'birthday';
              const icon = '•';
              const typeLabel = isBirthday
                ? (isHi ? 'जन्मदिन' : 'Birthday')
                : (isHi ? 'वर्षगाँठ' : 'Anniversary');

              let yearsText = '';
              if (m.years !== null && m.years > 0) {
                yearsText = isBirthday
                  ? (isHi ? ` · ${m.years} वर्ष` : ` · Turns ${m.years}`)
                  : (isHi ? ` · ${m.years}वीं वर्षगाँठ` : ` · ${m.years} yr${m.years === 1 ? '' : 's'}`);
              }

              return (
                <button
                  key={`${m.type}-${m.person.id}`}
                  type="button"
                  onClick={() => handleSelect(m.person.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: isToday ? '1.5px solid var(--accent, #b45309)' : '1px solid var(--line, #e4e4e7)',
                    background: isToday ? 'rgba(180, 83, 9, 0.08)' : 'var(--bg, transparent)',
                    cursor: 'pointer',
                    color: 'inherit'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }} aria-hidden="true">
                      {icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </div>
                      <div className="muted" style={{ fontSize: '12px' }}>
                        {typeLabel} · {formatDate(m.nextDate)}{yearsText}
                      </div>
                    </div>
                  </div>
                  <span
                    className="tag"
                    style={{
                      flexShrink: 0,
                      fontWeight: isToday ? 700 : 600,
                      background: isToday ? 'var(--accent, #b45309)' : undefined,
                      color: isToday ? '#fff' : undefined
                    }}
                  >
                    {formatCountdown(m.daysUntil)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button
          className="btn"
          type="button"
          onClick={onClose}
          style={{ marginTop: '16px', width: '100%' }}
        >
          {isHi ? 'बंद करें' : 'Close'}
        </button>
      </div>
    </div>
  );
}

export default MilestonesModal;
