import React from 'react';
import './ContactCard.css';

const CATEGORY_COLORS = {
  personal: '#cba6f7',
  work: '#89b4fa',
  family: '#a6e3a1',
  friend: '#fab387',
  other: '#a6adc8'
};

const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
};

const getAvatarColor = (name) => {
  const colors = ['#cba6f7', '#89b4fa', '#a6e3a1', '#fab387', '#f38ba8', '#94e2d5', '#f9e2af'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const ContactCard = ({ contact, onEdit, onDelete, onToggleFavorite, selected, onSelect }) => {
  const initials = getInitials(contact.firstName, contact.lastName);
  const avatarColor = getAvatarColor(contact.firstName + contact.lastName);
  const catColor = CATEGORY_COLORS[contact.category] || CATEGORY_COLORS.other;

  return (
    <div className={`contact-card ${selected ? 'selected' : ''}`}>
      {/* Select Checkbox */}
      <div className="card-select" onClick={(e) => { e.stopPropagation(); onSelect(contact._id); }}>
        <div className={`checkbox ${selected ? 'checked' : ''}`}>
          {selected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
      </div>

      {/* Avatar */}
      <div className="card-avatar" style={{ background: `${avatarColor}22`, borderColor: `${avatarColor}44` }}>
        <span style={{ color: avatarColor }}>{initials}</span>
      </div>

      {/* Info */}
      <div className="card-info">
        <div className="card-name-row">
          <h3 className="card-name">{contact.firstName} {contact.lastName}</h3>
          <span className="card-category" style={{ color: catColor, background: `${catColor}18` }}>
            {contact.category}
          </span>
        </div>
        {contact.jobTitle && contact.company && (
          <p className="card-subtitle">{contact.jobTitle} · {contact.company}</p>
        )}
        {(contact.jobTitle && !contact.company) && <p className="card-subtitle">{contact.jobTitle}</p>}
        {(!contact.jobTitle && contact.company) && <p className="card-subtitle">{contact.company}</p>}
        {contact.email && (
          <div className="card-detail">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <polyline points="22,4 12,13 2,4"/>
            </svg>
            <span>{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="card-detail">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.44 2 2 0 0 1 3.59 2.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>{contact.phone}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="card-actions">
        <button
          className={`btn-icon favorite-btn ${contact.isFavorite ? 'is-favorite' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(contact._id); }}
          title={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24"
            fill={contact.isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
        <button
          className="btn-icon edit-btn"
          onClick={(e) => { e.stopPropagation(); onEdit(contact); }}
          title="Edit contact"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          className="btn-icon delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(contact._id, contact.firstName); }}
          title="Delete contact"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ContactCard;