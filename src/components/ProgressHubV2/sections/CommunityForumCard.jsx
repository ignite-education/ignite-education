import React from 'react';
import { MessageSquare } from 'lucide-react';

const CommunityForumCard = ({ courseName, courseReddit }) => {
  const handleOpenForum = () => {
    window.open(courseReddit?.url || 'https://www.reddit.com/r/ProductManagement/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ marginTop: '1.5rem', minHeight: '120px' }}>
      <h2 className="font-semibold text-white" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '-2px' }}>Community Forum</h2>
      <button
        onClick={handleOpenForum}
        className="flex items-center gap-3 w-full rounded-lg transition-colors hover:bg-white/10"
        style={{ padding: '14px', background: '#7714E0' }}
      >
        <div className="bg-white flex items-center justify-center flex-shrink-0" style={{ width: '48px', height: '48px', borderRadius: '0.3rem' }}>
          <MessageSquare size={22} className="text-black" />
        </div>
        <div className="text-left flex-1">
          <p className="text-white font-semibold" style={{ fontSize: '14px', marginBottom: '2px' }}>
            Join the {courseName || 'Product Manager'} conversation
          </p>
          <p className="text-purple-200" style={{ fontSize: '12px' }}>
            Open {courseReddit?.channel || 'r/ProductManagement'} on Reddit
          </p>
        </div>
        <svg className="text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default CommunityForumCard;
