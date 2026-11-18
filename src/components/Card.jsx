import React from 'react';
import { getInitials } from '../data/familyData.js';
import { isSafePhotoUrl } from '../data/schema.js';

export function Avatar({ photo, label = '', text = '?', big = false, gender = '' }) {
  const genderClass = gender === 'M' ? ' is-male' : gender === 'F' ? ' is-female' : '';
  const safePhoto = typeof photo === 'string' && isSafePhotoUrl(photo) ? photo.trim() : '';
  return (
    <div className={`av${big ? " big" : ""}${genderClass}`}>
      {safePhoto ? (
        <img src={safePhoto} alt={label || ''} loading="lazy" decoding="async" />
      ) : (
        <span>{text || '?'}</span>
      )}
    </div>
  );
}

export function Card({
  person,
  pos,
  cardHeight = 138,
  relationLabel = '',
  photo,
  isMe = false,
  isHit = false,
  isDim = false,
  t,
  displayName,
  onClick,
  onKeyDown,
  zoom = 1
}) {
  if (!person || !person.id) return null;

  const translate =
    typeof t === 'function'
      ? t
      : (key, arg) => {
          if (key === 'photoOf') return `Photo of ${arg || ''}`;
          if (key === 'lateTag') return 'Late';
          return key;
        };

  const resolvedName =
    typeof displayName === 'function'
      ? displayName(person.id)
      : person.name || person.hi || person.id;
  const name = resolvedName || person.name || person.id || '';
  const initials = getInitials(name);
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const isCompact = safeZoom < 0.6;
  const genderClass = person.g === 'M' ? ' is-male' : person.g === 'F' ? ' is-female' : '';
  const lateClass = person.late ? ' is-late' : '';
  const safeX = Number.isFinite(pos?.x) ? pos.x : 0;
  const safeY = Number.isFinite(pos?.y) ? pos.y : 0;
  const safeHeight = Number.isFinite(cardHeight) && cardHeight > 0 ? cardHeight : 138;
  const cleanRelLabel = typeof relationLabel === 'string' ? relationLabel.trim() : '';

  const handleKeyDown = (e) => {
    onKeyDown?.(e);
    if (!e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.(e);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-person-id={person.id}
      className={`card${genderClass}${lateClass}${isMe ? " me" : ""}${isHit ? " hit" : ""}${isDim ? " dim" : ""}${isCompact ? " is-compact" : ""}`}
      style={{
        left: `${safeX}px`,
        top: `${safeY}px`,
        width: "96px",
        height: `${safeHeight}px`
      }}
      aria-label={cleanRelLabel ? `${name}, ${cleanRelLabel}` : name}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <Avatar photo={photo} label={translate("photoOf", name)} text={initials} gender={person.g} />
      {!isCompact && <span className="nm">{name}</span>}
      {!isCompact && cleanRelLabel && <span className="rl">{cleanRelLabel}</span>}
      {!isCompact && person.late && <span className="tag">{translate("lateTag")}</span>}
    </div>
  );
}

export default Card;
