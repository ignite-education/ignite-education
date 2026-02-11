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

const formatJoinDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Joined ${months[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
};

const IntroSection = ({ firstName, profilePicture, progressPercentage, courseTitle, joinedAt }) => {
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
      className="bg-white"
      style={{
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
          <div style={{ marginBottom: '45px' }}>
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
          <div style={{ marginBottom: '25px', marginLeft: '6px' }}>
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
              className="inline-block px-[8px] py-[3px] text-black bg-[#F8F8F8] rounded-[4px] font-medium"
              style={{ fontSize: '14px', letterSpacing: '-0.02em', marginTop: '16px', alignSelf: 'flex-start' }}
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
            <p className="text-black" style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '75px', letterSpacing: '-0.01em' }}>
              Overall, you're scoring great. You're average so far
              is 73%, with particular strengths in Design Thinking
              and Prototyping Tools. Your next lesson is Agile Methodologies.
              Keep it up, {firstName}!
            </p>

            {/* Stats Row */}
            <div className="flex items-center justify-between">
              {[
                { label: "You're in the top", value: '15% of learners' },
                { label: "You're a late", value: 'night learner' },
                { label: '134 learners', value: 'in the UK' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center flex flex-col items-center">
                  <div className="bg-[#F8F8F8] rounded-[6px]" style={{ width: '75px', height: '75px', marginBottom: '8px' }} />
                  <p className="text-black font-medium" style={{ fontSize: '16px', lineHeight: '1.3', letterSpacing: '-0.01em' }}>
                    {stat.label}
                  </p>
                  <p className="text-black font-medium" style={{ fontSize: '16px', lineHeight: '1.3', letterSpacing: '-0.01em' }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroSection;
