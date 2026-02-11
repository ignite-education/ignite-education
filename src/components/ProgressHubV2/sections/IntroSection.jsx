import React, { useRef, useEffect } from 'react';
import Lottie from 'lottie-react';
import { useAnimation } from '../../../contexts/AnimationContext';
import useTypingAnimation from '../../../hooks/useTypingAnimation';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const IntroSection = ({ firstName, profilePicture, progressPercentage, courseTitle }) => {
  const { lottieData } = useAnimation();
  const lottieRef = useRef(null);
  const loopCountRef = useRef(0);

  const { displayText: typedName, isComplete: isTypingComplete } = useTypingAnimation(firstName || '', {
    charDelay: 85,
    startDelay: 800,
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
      className="bg-white px-12 pt-12"
      style={{
        height: '70vh',
        minHeight: '500px',
        fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div className="flex w-full gap-16 items-start">
        {/* Left Column: Logo, Avatar, Greeting */}
        <div className="flex flex-col" style={{ width: '50%', flexShrink: 0 }}>
          {/* Lottie Logo */}
          <div style={{ marginBottom: '24px' }}>
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
                style={{ width: 68, height: 68 }}
              />
            ) : (
              <div style={{ width: 68, height: 68 }} />
            )}
          </div>

          {/* Profile Picture */}
          <div style={{ marginBottom: '25px', marginLeft: '6px' }}>
            {profilePicture ? (
              <img
                src={profilePicture.replace(/=s\d+-c/, '=s200-c')}
                alt={firstName}
                className="object-cover"
                style={{ width: '130px', height: '130px', borderRadius: '0.2rem' }}
              />
            ) : (
              <div
                className="bg-[#7714E0] flex items-center justify-center text-white font-bold"
                style={{ width: '130px', height: '130px', fontSize: '36px', borderRadius: '0.2rem' }}
              >
                {(firstName || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Greeting */}
          <h1 className="font-bold text-black" style={{ fontSize: '2.5rem', lineHeight: '1.2', letterSpacing: '-0.01em' }}>
            {getGreeting()},{' '}
            <span style={{ color: '#EF0B72' }}>
              {typedName}
              {!isTypingComplete && <span className="animate-blink font-light">|</span>}
            </span>
          </h1>
        </div>

        {/* Right Column: Progress Summary + Stats */}
        <div className="flex flex-col justify-center" style={{ width: '50%', flexShrink: 0 }}>
          {/* Progress Summary */}
          <p className="text-black font-semibold" style={{ fontSize: '18px', marginBottom: '6px' }}>
            You're <span>{progressPercentage}%</span> through the {courseTitle} course.
          </p>
          <p className="text-gray-600" style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Overall, you're scoring great. You're average so far
            is 73%, with particular strengths in Design Thinking
            and Prototyping Tools. Your next lesson is Agile Methodologies.
            Keep it up, {firstName}!
          </p>

          {/* Stats Row */}
          <div className="flex items-center gap-10">
            {[
              { label: "You're in the top", value: '15% of learners' },
              { label: "You're a late", value: 'night learner' },
              { label: '134 learners', value: 'in the UK' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="text-black font-semibold" style={{ fontSize: '14px', lineHeight: '1.3' }}>
                  {stat.label}
                </p>
                <p className="text-black font-semibold" style={{ fontSize: '14px', lineHeight: '1.3' }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroSection;
