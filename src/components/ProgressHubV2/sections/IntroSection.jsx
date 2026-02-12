import React, { useRef, useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { useAnimation } from '../../../contexts/AnimationContext';
import useTypingAnimation from '../../../hooks/useTypingAnimation';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatJoinDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Joined ${months[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
};

const SettingsCog = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  const iconColor = hovered ? '#EF0B72' : '#000000';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-[#F8F8F8] flex items-center justify-center rounded-[4px]"
      style={{
        position: 'absolute',
        bottom: '30px',
        left: '40px',
        width: '29px',
        height: '29px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      }}
    >
      <svg
        width="23"
        height="23"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
          stroke={iconColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.2s ease' }}
        />
        <path
          d="M16.167 12.5a1.375 1.375 0 0 0 .275 1.517l.05.05a1.667 1.667 0 1 1-2.359 2.358l-.05-.05a1.375 1.375 0 0 0-1.516-.275 1.375 1.375 0 0 0-.834 1.258v.142a1.667 1.667 0 1 1-3.333 0v-.075a1.375 1.375 0 0 0-.9-1.258 1.375 1.375 0 0 0-1.517.275l-.05.05a1.667 1.667 0 1 1-2.358-2.359l.05-.05A1.375 1.375 0 0 0 3.9 12.567a1.375 1.375 0 0 0-1.258-.834h-.142a1.667 1.667 0 0 1 0-3.333h.075a1.375 1.375 0 0 0 1.258-.9 1.375 1.375 0 0 0-.275-1.517l-.05-.05A1.667 1.667 0 1 1 5.867 3.575l.05.05a1.375 1.375 0 0 0 1.516.275h.067a1.375 1.375 0 0 0 .833-1.258v-.142a1.667 1.667 0 0 1 3.334 0v.075a1.375 1.375 0 0 0 .833 1.258 1.375 1.375 0 0 0 1.517-.275l.05-.05a1.667 1.667 0 1 1 2.358 2.358l-.05.05a1.375 1.375 0 0 0-.275 1.517v.067a1.375 1.375 0 0 0 1.258.833h.142a1.667 1.667 0 0 1 0 3.334h-.075a1.375 1.375 0 0 0-1.258.833Z"
          stroke={iconColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.2s ease' }}
        />
      </svg>
    </div>
  );
};

const IntroSection = ({ firstName, profilePicture, progressPercentage, courseTitle, joinedAt, onSettingsClick }) => {
  const { lottieData } = useAnimation();
  const lottieRef = useRef(null);
  const loopCountRef = useRef(0);

  const { displayText: typedName, isComplete: isTypingComplete } = useTypingAnimation(firstName || '', {
    charDelay: 100,
    startDelay: 1000,
    enabled: !!firstName,
  });

  useEffect(() => {
    if (lottieData && lottieRef.current) {
      const timer = setTimeout(() => {
        lottieRef.current?.play();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lottieData]);

  return (
    <section
      className="bg-white"
      style={{
        position: 'relative',
        height: '70vh',
        minHeight: '500px',
        padding: '30px 40px 0 40px',
        fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div className="flex w-full gap-16 items-start">
        {/* Left Column: Logo, Avatar, Greeting */}
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
          {/* Lottie Logo */}
          <div style={{ marginBottom: '55px' }}>
            {lottieData && Object.keys(lottieData).length > 0 ? (
              <Lottie
                lottieRef={lottieRef}
                animationData={lottieData}
                loop={true}
                autoplay={false}
                onLoopComplete={() => {
                  loopCountRef.current += 1;
                  if (loopCountRef.current % 3 === 0 && lottieRef.current) {
                    lottieRef.current.pause();
                    setTimeout(() => {
                      lottieRef.current?.goToAndPlay(0);
                    }, 4000);
                  }
                }}
                style={{ width: 61, height: 61 }}
              />
            ) : (
              <div style={{ width: 61, height: 61 }} />
            )}
          </div>

          {/* Profile Picture */}
          <div style={{ marginBottom: '30px', marginLeft: '6px' }}>
            {profilePicture ? (
              <img
                src={profilePicture.replace(/=s\d+-c/, '=s200-c')}
                alt={firstName}
                className="object-cover"
                style={{ width: '150px', height: '150px', borderRadius: '0.1rem' }}
              />
            ) : (
              <div
                className="bg-[#7714E0] flex items-center justify-center text-white font-bold"
                style={{ width: '150px', height: '150px', fontSize: '36px', borderRadius: '0.1rem' }}
              >
                {(firstName || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Greeting */}
          <h1 className="font-bold text-black" style={{ fontSize: '2.4rem', lineHeight: '1.2', letterSpacing: '-0.01em' }}>
            {getGreeting()},{' '}
            <span style={{ color: '#EF0B72' }}>
              {typedName}
            </span>
          </h1>

          {/* Joined Tag */}
          {formatJoinDate(joinedAt) && (
            <span
              className="inline-block px-[8px] py-[3px] text-black bg-[#F8F8F8] rounded-[4px] font-normal"
              style={{ fontSize: '12px', letterSpacing: '-0.02em', marginTop: '16px', alignSelf: 'flex-start' }}
            >
              {formatJoinDate(joinedAt)}
            </span>
          )}
        </div>

        {/* Right Column: Progress Summary + Stats */}
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0, paddingTop: '106px' }}>
          <div style={{ maxWidth: '550px' }}>
            {/* Progress Summary */}
            <p className="text-black font-semibold" style={{ fontSize: '20px', marginBottom: '6px' }}>
              You're <span>{progressPercentage}%</span> through the {courseTitle} course.
            </p>
            <p className="text-black" style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '50px', letterSpacing: '-0.01em', fontWeight: 300 }}>
              Overall, you're scoring great. You're average so far
              is 73%, with particular strengths in Design Thinking
              and Prototyping Tools. Your next lesson is Agile Methodologies.
              Keep it up, {firstName}!
            </p>

            {/* Stats Row */}
            <div className="flex items-center justify-between" style={{ paddingLeft: '25px', paddingRight: '50px' }}>
              {[
                { label: "You're in the top", value: '15% of learners' },
                { label: "You're a late", value: 'night learner' },
                { label: '134 learners', value: 'in the UK' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center flex flex-col items-center">
                  <div className="bg-[#F8F8F8] rounded-[6px]" style={{ width: '75px', height: '75px', marginBottom: '8px' }} />
                  <p className="text-black font-normal" style={{ fontSize: '16px', lineHeight: '1.3', letterSpacing: '-0.01em' }}>
                    {stat.label}
                  </p>
                  <p className="text-black font-normal" style={{ fontSize: '16px', lineHeight: '1.3', letterSpacing: '-0.01em' }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Icon */}
      <SettingsCog onClick={onSettingsClick} />
    </section>
  );
};

export default IntroSection;
