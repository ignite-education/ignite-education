import React from 'react';

const COUNTRY_NAMES = {
  GB: 'UK', US: 'USA', IN: 'India', FR: 'France',
  DE: 'Germany', IT: 'Italy', ES: 'Spain',
};

const QueueList = ({ queue, currentUserId }) => {
  if (!queue || queue.length === 0) return null;

  return (
    <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', margin: '0 0 12px', letterSpacing: '-0.01em', flexShrink: 0 }}>
        List
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', scrollbarWidth: 'none', minHeight: 0 }}>
        {queue.map((entry) => {
          const isCurrentUser = entry.userId === currentUserId;
          const countryName = COUNTRY_NAMES[entry.country] || entry.country || null;
          const initial = (entry.firstName || 'S').charAt(0).toUpperCase();

          return (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0',
                paddingLeft: '0',
              }}
            >
              {/* Profile image */}
              {entry.profilePicture ? (
                <img
                  src={entry.profilePicture}
                  alt={entry.firstName}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '4px',
                    backgroundColor: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#6b7280',
                  }}
                >
                  {initial}
                </div>
              )}

              {/* Name */}
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#111',
                letterSpacing: '-0.01em',
                flexShrink: 0,
                minWidth: '125px',
              }}>
                {entry.firstName} {entry.lastName?.charAt(0)}.
              </span>

              {/* Topic */}
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 300,
                color: '#000',
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}>
                {entry.topic}
              </span>

              {/* Country tag */}
              {countryName && (
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 400,
                  color: '#8200EA',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  width: '55px',
                  textAlign: 'center',
                  boxSizing: 'content-box',
                  flexShrink: 0,
                  letterSpacing: '-0.01em',
                }}>
                  {countryName}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QueueList;
