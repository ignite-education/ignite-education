import React from 'react';
import { Settings } from 'lucide-react';
import useTypingAnimation from '../../../hooks/useTypingAnimation';

const IGNITE_LOGO = 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatJoinDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

const IntroSection = ({ firstName, profilePicture, progressPercentage, courseTitle, authUser, onOpenSettings }) => {
  const { displayText: typedName, isComplete: isTypingComplete } = useTypingAnimation(firstName || '', {
    charDelay: 85,
    startDelay: 800,
    enabled: !!firstName,
  });

  const joinDate = authUser?.created_at ? formatJoinDate(authUser.created_at) : '';

  return (
    <section className="bg-black px-12 pt-6 pb-10" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Logo */}
      <div
        style={{
          backgroundImage: `url(${IGNITE_LOGO})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          width: '32px',
          height: '32px',
          marginBottom: '24px',
        }}
      />

      <div className="flex items-start gap-8">
        {/* Profile Picture */}
        <div className="flex-shrink-0">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={firstName}
              className="rounded-lg object-cover"
              style={{ width: '100px', height: '100px' }}
            />
          ) : (
            <div
              className="rounded-lg bg-[#7714E0] flex items-center justify-center text-white font-bold"
              style={{ width: '100px', height: '100px', fontSize: '36px' }}
            >
              {(firstName || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Progress Summary */}
        <div className="flex-1 pt-1">
          <p className="text-white font-semibold" style={{ fontSize: '18px', marginBottom: '6px' }}>
            You're <span className="text-white">{progressPercentage}%</span> through the {courseTitle} course.
          </p>
          <p className="text-gray-300" style={{ fontSize: '14px', lineHeight: '1.6' }}>
            Overall, you're scoring great. You're average so far
            is 73%, with particular strengths in Design Thinking
            and Prototyping Tools. Your next lesson is Agile Methodologies.
            Keep it up, {firstName}!
          </p>
        </div>
      </div>

      {/* Greeting */}
      <h1 className="font-semibold mt-6" style={{ fontSize: '34px', marginBottom: '4px' }}>
        {getGreeting()}, <span style={{ color: '#EF0B72' }}>
          {typedName}
          {!isTypingComplete && <span className="animate-blink font-light">|</span>}
        </span>
      </h1>

      {/* Join date */}
      {joinDate && (
        <p className="text-gray-400" style={{ fontSize: '13px', marginBottom: '16px' }}>
          Joined {joinDate}
        </p>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-10 mt-2" style={{ marginBottom: '8px' }}>
        {[
          { label: "You're in the top", value: '15% of learners' },
          { label: "You're a late", value: 'night learner' },
          { label: '134 learners', value: 'in the UK' },
        ].map((stat, idx) => (
          <div key={idx} className="text-center">
            <p className="text-white font-semibold" style={{ fontSize: '14px', lineHeight: '1.3' }}>
              {stat.label}
            </p>
            <p className="text-white font-semibold" style={{ fontSize: '14px', lineHeight: '1.3' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Settings Link */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 text-gray-400 hover:text-[#EF0B72] transition mt-2"
        style={{ fontSize: '13px' }}
      >
        <Settings size={14} />
        Settings
      </button>
    </section>
  );
};

export default IntroSection;
