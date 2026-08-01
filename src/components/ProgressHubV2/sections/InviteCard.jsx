import React, { useState, useEffect, useCallback } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { getReferralSummary } from '../../../lib/api';

/**
 * The referrer's side of the referral loop.
 *
 * Anyone who creates an account from this user's public profile earns them a
 * free week of Ignite Insider — once that new person completes their first
 * lesson. The share glyph in IntroSection's icon row does the same thing, but
 * nobody finds it; this card is what makes the offer legible.
 *
 * Sits beside OfficeHoursCard in the black CourseDetailsSection, so it borrows
 * that card's shape (rounded-lg, generous padding) but the pink brand colour to
 * separate it from the purple Insider surfaces.
 *
 * Renders nothing when the user has no public profile — there is no link to
 * share, and users.is_public has no UI to turn back on.
 */
const InviteCard = () => {
  const isMobile = useIsMobile();
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReferralSummary()
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => { /* Card stays hidden; nothing here is load-bearing. */ });
    return () => { cancelled = true; };
  }, []);

  const shareUrl = summary?.profileUrl ? `${summary.profileUrl}?ref=${summary.profileUrl.split('/').pop()}` : null;

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    const shareData = {
      title: 'Learn with me on Ignite Education',
      text: 'Join me on Ignite and we both get a free week of Ignite Insider',
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        // Fall through to the clipboard on anything else.
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [shareUrl]);

  if (!summary?.profileUrl) return null;

  const { invited = 0, weeksEarned = 0, pending = 0 } = summary;

  // Only worth showing numbers once there's something to count.
  const stats = [];
  if (invited > 0) stats.push(`${invited} invited`);
  if (weeksEarned > 0) stats.push(`${weeksEarned} ${weeksEarned === 1 ? 'week' : 'weeks'} earned`);
  if (pending > 0 && weeksEarned === 0) stats.push(`${pending} yet to start`);

  return (
    <div style={{ marginTop: '0.875rem' }}>
      <h2
        className="font-semibold text-white leading-snug"
        style={{ fontSize: isMobile ? '1.4rem' : '1.6rem', letterSpacing: '0%', marginBottom: '0.75rem' }}
      >
        Invite a friend
      </h2>
      <div
        className="rounded-lg flex items-center group"
        style={{
          padding: '1.25rem 1rem 1.3rem 1rem',
          minHeight: '100px',
          background: '#EF0B72',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={handleShare}
      >
        <div className="flex gap-2.5 w-full items-center">
          <div className="flex-1 min-w-0">
            <h3
              className="text-white leading-snug"
              style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '2px' }}
            >
              You both get a free week of Insider
            </h3>
            <p
              className="text-white leading-snug"
              style={{ fontSize: '0.9rem', fontWeight: 300, marginBottom: stats.length ? '0.5rem' : 0 }}
            >
              Share your profile. When someone joins through it and starts learning,
              your free week begins.
            </p>
            {stats.length > 0 && (
              <p className="text-white leading-snug" style={{ fontSize: '0.85rem', fontWeight: 400 }}>
                {stats.join(' · ')}
              </p>
            )}
          </div>

          <div className="flex items-center" style={{ paddingRight: '2px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="bg-white text-black font-bold hover:bg-pink-50 transition-colors flex-shrink-0"
              style={{
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.3rem',
              }}
              title={copied ? 'Link copied' : 'Share your profile link'}
              aria-label="Share your profile link"
            >
              {copied ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg className="group-hover:stroke-pink-500 transition-colors" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteCard;
