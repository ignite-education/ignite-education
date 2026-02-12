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

const ConfettiBurst = () => {
  const particles = Array.from({ length: 10 }, (_, i) => {
    // Spread across upper arc: -150deg to -30deg (top-left through top to top-right)
    const angle = -150 + (i / 9) * 120 + (Math.random() - 0.5) * 20;
    const distance = 40 + Math.random() * 50;
    const tx = Math.cos((angle * Math.PI) / 180) * distance;
    const ty = Math.sin((angle * Math.PI) / 180) * distance;
    const size = 8;
    const delay = Math.random() * 0.3;
    const shape = Math.random() > 0.5 ? 'circle' : 'square';
    return { id: i, tx, ty, size, delay, shape };
  });

  return (
    <>
      <style>{`
        @keyframes confettiBurst {
          0% { opacity: 1; transform: translate(0, 0) scale(0); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(1); }
        }
      `}</style>
      <div style={{ position: 'absolute', top: 0, left: '50%', width: 0, height: 0, pointerEvents: 'none', zIndex: -1 }}>
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: '#7714E0',
              borderRadius: p.shape === 'circle' ? '50%' : '1px',
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              animation: `confettiBurst 1.2s ease-out ${p.delay}s forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </>
  );
};

const ShareButton = () => {
  const [hovered, setHovered] = useState(false);
  const iconColor = hovered ? '#EF0B72' : '#000000';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center justify-center rounded-[4px]"
      style={{
        width: '29px',
        height: '29px',
        cursor: 'pointer',
      }}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g style={{ transition: 'transform 0.2s ease', transform: hovered ? 'translateY(-2px)' : 'translateY(0)' }}>
          <path
            d="M12 3v12M8 7l4-4 4 4"
            stroke={iconColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: 'stroke 0.2s ease' }}
          />
        </g>
        <path
          d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"
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

const SettingsCog = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  const iconColor = hovered ? '#EF0B72' : '#000000';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center justify-center rounded-[4px]"
      style={{
        width: '29px',
        height: '29px',
        cursor: 'pointer',
      }}
    >
      <svg
        width="23"
        height="23"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transition: 'transform 0.3s ease', transform: hovered ? 'rotate(45deg)' : 'rotate(0deg)' }}
      >
        <path
          d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.2s ease' }}
        />
        <path
          d="M16.167 12.5a1.375 1.375 0 0 0 .275 1.517l.05.05a1.667 1.667 0 1 1-2.359 2.358l-.05-.05a1.375 1.375 0 0 0-1.516-.275 1.375 1.375 0 0 0-.834 1.258v.142a1.667 1.667 0 1 1-3.333 0v-.075a1.375 1.375 0 0 0-.9-1.258 1.375 1.375 0 0 0-1.517.275l-.05.05a1.667 1.667 0 1 1-2.358-2.359l.05-.05A1.375 1.375 0 0 0 3.9 12.567a1.375 1.375 0 0 0-1.258-.834h-.142a1.667 1.667 0 0 1 0-3.333h.075a1.375 1.375 0 0 0 1.258-.9 1.375 1.375 0 0 0-.275-1.517l-.05-.05A1.667 1.667 0 1 1 5.867 3.575l.05.05a1.375 1.375 0 0 0 1.516.275h.067a1.375 1.375 0 0 0 .833-1.258v-.142a1.667 1.667 0 0 1 3.334 0v.075a1.375 1.375 0 0 0 .833 1.258 1.375 1.375 0 0 0 1.517-.275l.05-.05a1.667 1.667 0 1 1 2.358 2.358l-.05.05a1.375 1.375 0 0 0-.275 1.517v.067a1.375 1.375 0 0 0 1.258.833h.142a1.667 1.667 0 0 1 0 3.334h-.075a1.375 1.375 0 0 0-1.258.833Z"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.2s ease' }}
        />
      </svg>
    </div>
  );
};

const IntroSection = ({ firstName, profilePicture, progressPercentage, courseTitle, joinedAt, totalCompletedLessons, userId, onSettingsClick }) => {
  const { lottieData } = useAnimation();
  const lottieRef = useRef(null);
  const loopCountRef = useRef(0);

  const [showConfetti, setShowConfetti] = useState(false);

  const { displayText: typedName, isComplete: isTypingComplete } = useTypingAnimation(firstName || '', {
    charDelay: 100,
    startDelay: 1000,
    enabled: !!firstName,
  });

  useEffect(() => {
    if (totalCompletedLessons < 1 || !userId) return;

    const storageKey = `ignite_lesson_tag_confetti_shown_${userId}`;
    const alreadyShown = localStorage.getItem(storageKey);

    if (!alreadyShown) {
      localStorage.setItem(storageKey, 'true');
      const startTimer = setTimeout(() => {
        setShowConfetti(true);
      }, 1000);

      const hideTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 4000);

      return () => {
        clearTimeout(startTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [totalCompletedLessons, userId]);

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

          {/* Tags Row */}
          <div className="flex items-center gap-2" style={{ marginTop: '16px' }}>
            {/* Joined Tag */}
            {formatJoinDate(joinedAt) && (
              <span
                className="inline-block px-[8px] py-[3px] text-black bg-[#F2F2F2] rounded-[4px] font-normal"
                style={{ fontSize: '12px', letterSpacing: '-0.02em' }}
              >
                {formatJoinDate(joinedAt)}
              </span>
            )}

            {/* Lesson Tag */}
            {totalCompletedLessons >= 1 && (
              <span
                className="inline-block px-[8px] py-[3px] text-black bg-[#F2F2F2] rounded-[4px] font-normal"
                style={{ fontSize: '12px', letterSpacing: '-0.02em', position: 'relative' }}
              >
                {totalCompletedLessons === 1 ? '1 Lesson' : `${totalCompletedLessons} Lessons`}
                {showConfetti && <ConfettiBurst />}
              </span>
            )}
          </div>
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
                  <div className="bg-[#E6E6E6] rounded-[6px]" style={{ width: '75px', height: '75px', marginBottom: '8px' }} />
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

      {/* Bottom Icons */}
      <div className="flex items-center gap-2" style={{ position: 'absolute', bottom: '30px', left: '40px' }}>
        <SettingsCog onClick={onSettingsClick} />
        <ShareButton />
      </div>
    </section>
  );
};

export default IntroSection;
