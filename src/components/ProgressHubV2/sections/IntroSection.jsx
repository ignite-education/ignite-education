import { useRef, useEffect, useState, useMemo } from 'react';
import Lottie from 'lottie-react';
import { useAnimation } from '../../../contexts/AnimationContext';
import useTypingAnimation from '../../../hooks/useTypingAnimation';

// Seed-based random to avoid flicker on re-renders (changes daily)
const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const pickRandom = (arr, seed) => arr[Math.floor(seededRandom(seed) * arr.length)];

const generateIntroText = ({ firstName, courseTitle, progressPercentage, completedLessons, lessonsMetadata, userLessonScores, upcomingLessons }) => {
  const completedCount = completedLessons?.length || 0;

  // Helper: look up lesson name from metadata
  const getLessonName = (moduleNum, lessonNum) => {
    const lesson = lessonsMetadata?.find(
      (l) => l.module_number === moduleNum && l.lesson_number === lessonNum
    );
    return lesson?.lesson_name || `Lesson ${lessonNum}`;
  };

  // Helper: get score percentage for a lesson
  const getLessonScore = (moduleNum, lessonNum) => {
    const key = `${moduleNum}-${lessonNum}`;
    const score = userLessonScores?.[key];
    if (!score || score.total === 0) return null;
    return Math.round((score.correct / score.total) * 100);
  };

  // --- Profile 1: No lessons completed ---
  if (completedCount === 0) {
    const firstLessonName = getLessonName(1, 1);
    return {
      headline: `Welcome to the ${courseTitle} course, ${firstName}.`,
      body: `Here you can see your progress, upcoming lessons, get support from industry professionals and connect with the global community. To get started, click on the ${firstLessonName} lesson below. Let's get started, ${firstName}!`,
      linkText: firstLessonName,
      linkUrl: '#course-details',
    };
  }

  // --- Profile 2: Exactly 1 lesson completed ---
  if (completedCount === 1) {
    const completed = completedLessons[0];
    const lessonName = getLessonName(completed.module_number, completed.lesson_number);
    const score = getLessonScore(completed.module_number, completed.lesson_number);
    const scoreText = score !== null ? `You scored ${score}% on ${lessonName}. ` : '';
    const linkText = 'to your LinkedIn';
    return {
      headline: `Congratulations on completing your first lesson, ${firstName}.`,
      body: `${scoreText}Mark your achievement by adding the ${courseTitle} course ${linkText}. Profiles with certifications get 6x more views than those without. Onwards, ${firstName}!`,
      linkText,
      linkUrl: `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(courseTitle)}&organizationId=106869661&certUrl=https://ignite.education`,
    };
  }

  // --- Profile 3: More than 1 lesson completed ---
  const daySeed = Math.floor(Date.now() / 86400000); // changes daily

  const intros = ['Overall,', 'So far,', 'Currently,'];
  const outros = ['Keep it up,', 'Keep climbing,', 'You\'ve got this,', 'Continue the great work,'];
  const randomIntro = pickRandom(intros, daySeed);
  const randomOutro = pickRandom(outros, daySeed + 1);

  // Compute average score across completed lessons
  let totalCorrect = 0;
  let totalQuestions = 0;
  const lessonScoresWithNames = [];

  for (const completed of completedLessons) {
    const key = `${completed.module_number}-${completed.lesson_number}`;
    const score = userLessonScores?.[key];
    if (score && score.total > 0) {
      totalCorrect += score.correct;
      totalQuestions += score.total;
      const pct = Math.round((score.correct / score.total) * 100);
      lessonScoresWithNames.push({
        name: getLessonName(completed.module_number, completed.lesson_number),
        score: pct,
      });
    }
  }

  const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

  // Score assessment
  let scoreAssessment = "you're progressing well";
  if (avgScore !== null) {
    if (avgScore > 80) scoreAssessment = "you're scoring great";
    else if (avgScore > 50) scoreAssessment = "you're scoring well";
  }

  // Top 2 highest-scoring lessons
  const sortedByScore = [...lessonScoresWithNames].sort((a, b) => b.score - a.score);
  const topLessons = sortedByScore.slice(0, 2);

  // Next upcoming lesson (first not completed)
  const completedSet = new Set(completedLessons.map((c) => `${c.module_number}-${c.lesson_number}`));
  const nextLesson = upcomingLessons?.find(
    (l) => !completedSet.has(`${l.module_number}-${l.lesson_number}`)
  );

  // Build body
  let body = `${randomIntro} ${scoreAssessment}.`;

  if (avgScore !== null) {
    body += ` Your average score so far is ${avgScore}%`;
    if (topLessons.length >= 2) {
      body += `, with particular strengths in ${topLessons[0].name} and ${topLessons[1].name}`;
    } else if (topLessons.length === 1) {
      body += `, with particular strengths in ${topLessons[0].name}`;
    }
    body += '.';
  }

  const nextLessonName = nextLesson ? (nextLesson.lesson_name || `Lesson ${nextLesson.lesson_number}`) : null;

  if (nextLessonName) {
    body += ` Your next lesson is ${nextLessonName}.`;
  }

  body += ` ${randomOutro} ${firstName}!`;

  return {
    headline: `You're ${progressPercentage}% through the ${courseTitle} course.`,
    body,
    ...(nextLessonName && { linkText: nextLessonName, linkUrl: '#course-details' }),
  };
};

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
  const [rotation, setRotation] = useState(0);
  const iconColor = hovered ? '#EF0B72' : '#000000';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); setRotation((r) => r + 45); }}
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
        style={{ transition: 'transform 0.3s ease', transform: `rotate(${rotation}deg)` }}
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

const IntroSection = ({ firstName, profilePicture, hasHighQualityAvatar, progressPercentage, courseTitle, joinedAt, totalCompletedLessons, userId, onSettingsClick, completedLessons, lessonsMetadata, userLessonScores, upcomingLessons }) => {
  const { lottieData } = useAnimation();
  const lottieRef = useRef(null);
  const loopCountRef = useRef(0);

  const [showConfetti, setShowConfetti] = useState(false);

  const introText = useMemo(() => generateIntroText({
    firstName, courseTitle, progressPercentage, completedLessons, lessonsMetadata, userLessonScores, upcomingLessons,
  }), [firstName, courseTitle, progressPercentage, completedLessons, lessonsMetadata, userLessonScores, upcomingLessons]);

  const renderBodyWithLink = (text) => {
    if (!introText.linkText || !introText.linkUrl) return text;
    const idx = text.indexOf(introText.linkText);
    if (idx === -1) return text;
    const before = text.substring(0, idx);
    const linkPart = text.substring(idx, idx + introText.linkText.length);
    const after = text.substring(idx + introText.linkText.length);
    const isAnchor = introText.linkUrl.startsWith('#');
    const handleClick = isAnchor ? (e) => {
      e.preventDefault();
      const el = document.getElementById(introText.linkUrl.slice(1));
      if (!el) return;
      const targetY = el.getBoundingClientRect().top + window.scrollY;
      const startY = window.scrollY;
      const distance = targetY - startY;
      const duration = 1000;
      let start = null;
      const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        window.scrollTo(0, startY + distance * ease(progress));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } : undefined;
    return (
      <>
        {before}
        <a
          href={introText.linkUrl}
          {...(!isAnchor && { target: '_blank', rel: 'noopener noreferrer' })}
          onClick={handleClick}
          className="intro-link"
          style={{ textDecoration: 'underline', color: 'inherit', transition: 'color 0.2s ease', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'inherit'; }}
        >
          {linkPart}
        </a>
        {after}
      </>
    );
  };

  const { displayText: typedName, isComplete } = useTypingAnimation(firstName || '', {
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
      <style>{`.intro-link:hover { color: #EF0B72 !important; }`}</style>
      <div className="flex w-full gap-16 items-start">
        {/* Left Column: Logo, Avatar, Greeting */}
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
          {/* Lottie Logo */}
          <a href="/welcome" style={{ marginBottom: '55px', display: 'block', width: 'fit-content' }}>
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
          </a>

          {/* Profile Picture */}
          <div style={{ marginBottom: '30px', marginLeft: '6px', position: 'relative', width: '150px', height: '150px' }}>
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
            {!hasHighQualityAvatar && (
              <button
                onClick={onSettingsClick}
                className="absolute flex items-center justify-center transition-colors group"
                style={{
                  bottom: '6px',
                  left: '6px',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
                title="Upload profile picture"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white group-hover:text-[#EF0B72] transition-colors" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Greeting */}
          <h1 className="font-bold text-black" style={{ fontSize: '2.4rem', lineHeight: '1.2', letterSpacing: '-0.01em' }}>
            {getGreeting()},{' '}
            <span style={{ color: '#EF0B72' }}>
              {typedName}
              {!isComplete && <span className="animate-blink" style={{ color: '#000000', fontWeight: 100 }}>|</span>}
            </span>
          </h1>

          {/* Tags Row */}
          <div className="flex items-center gap-2" style={{ marginTop: '16px' }}>
            {/* Joined Tag */}
            {formatJoinDate(joinedAt) && (
              <span
                className="inline-block px-[8px] py-[3px] text-black bg-[#F0F0F0] rounded-[4px] font-normal"
                style={{ fontSize: '12px', letterSpacing: '-0.02em' }}
              >
                {formatJoinDate(joinedAt)}
              </span>
            )}

            {/* Lesson Tag */}
            {totalCompletedLessons >= 1 && (
              <span
                className="inline-block px-[8px] py-[3px] text-black bg-[#F0F0F0] rounded-[4px] font-normal"
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
              {introText.headline}
            </p>
            <p className="text-black" style={{ fontSize: '17px', lineHeight: '1.6', letterSpacing: '-0.01em', fontWeight: 300, marginBottom: '43px' }}>
              {renderBodyWithLink(introText.body)}
            </p>

            {/* Stats Row */}
            <div className="flex items-center justify-between" style={{ paddingLeft: '25px', paddingRight: '50px' }}>
              {[
                { label: "You're in the top", value: '15% of learners', image: '/trophy.png' },
                { label: "You're a late", value: 'night learner', image: '/moon.png' },
                { label: '134 learners', value: 'in the UK', image: '/big-ben.png' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center flex flex-col items-center">
                  {stat.image ? (
                    <img src={stat.image} alt="" style={{ width: '68px', height: '68px', objectFit: 'contain', marginBottom: '8px' }} />
                  ) : (
                    <div className="bg-[#F0F0F0] rounded-[6px]" style={{ width: '68px', height: '68px', marginBottom: '8px' }} />
                  )}
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
