import React from 'react';
import { getInitials } from '../data/familyData.js';

export function Avatar({ photo, label, text, big = false }) {
  return (
    <div className={`av${big ? " big" : ""}`}>
      {photo ? (
        <img src={photo} alt={label} />
      ) : (
        <span>{text}</span>
      )}
    </div>
  );
}

export function Card({
  person,
  pos,
  cardHeight = 138,
  relationLabel,
  photo,
  isMe,
  isHit,
  isDim,
  t,
  displayName,
  onClick,
  onKeyDown,
  zoom = 1
}) {
  const name = displayName(person.id);
  const initials = getInitials(name);
  const isCompact = zoom < 0.6;

  return (
    <div
      role="button"
      tabIndex={0}
      data-person-id={person.id}
      className={`card${isMe ? " me" : ""}${isHit ? " hit" : ""}${isDim ? " dim" : ""}${isCompact ? " is-compact" : ""}`}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: "96px",
        height: `${cardHeight}px`
      }}
      aria-label={relationLabel ? `${name}, ${relationLabel}` : name}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <Avatar photo={photo} label={t("photoOf", name)} text={initials} />
      {!isCompact && <span className="nm">{name}</span>}
      {!isCompact && relationLabel && <span className="rl">{relationLabel}</span>}
      {!isCompact && person.late && <span className="tag">{t("lateTag")}</span>}
    </div>
  );
}

export default Card;
