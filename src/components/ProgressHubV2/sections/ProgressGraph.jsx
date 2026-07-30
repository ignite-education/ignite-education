import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useIsMobile from '../hooks/useIsMobile';

const PINK_RGB = [239, 11, 114]; // #EF0B72
const GREY_RGB = [117, 117, 117]; // #757575
const BRIGHT_FLOOR = 0.34; // luminance at SCORE_FLOOR — dim but still readable on black
// Real scores cluster in the top half of the range, so anchor the ramp there
// rather than at 0 — otherwise every block lands in the same narrow band of pink.
const SCORE_FLOOR = 50;

// One lesson = one rectangle: pink once you've completed it, grey until then.
// Modules stack them bottom-up. `minGraphH` holds the section height steady for
// the stack sizes we see in practice; it only grows for unusually tall modules.
// `gap` is between blocks; `baseOffset` is the clearance below the lowest block.
const DESKTOP = {
  minGraphH: 120, rectW: 50, rectH: 18, gap: 6,
  baseOffset: 8, topPad: 4, radius: 2, hitPadX: 8, wideW: 80,
};
const MOBILE = {
  minGraphH: 96, rectW: 20, rectH: 13, gap: 4,
  baseOffset: 5, topPad: 3, radius: 2, hitPadX: 4, wideW: 36,
};

// Reveal — the course-card intro from /welcome (`fadeInUpSmall ease-out forwards`,
// 0.1s stagger), ordered bottom-to-top, slowed 1.5x and with a shorter rise.
// Local keyframe rather than the shared `fadeInUpSmall` so the catalog is untouched.
const REVEAL_MS = 900;
const ROW_STAGGER = 250; // ms per row, bottom → top; modules all move together
const REVEAL_RISE = 4; // px travelled on the way in (/welcome cards use 10px)

const TOOLTIP_H = 100;

// Brightness encodes score. Scaling sRGB channels keeps hue exact and gives a
// near-linear perceptual lightness ramp, because sRGB is already gamma-encoded.
const brightness = (score) => {
  const t = (score - SCORE_FLOOR) / (100 - SCORE_FLOOR);
  return BRIGHT_FLOOR + (1 - BRIGHT_FLOOR) * Math.max(0, Math.min(1, t));
};

const shade = ([r, g, b], score) => {
  const k = brightness(score);
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
};

// Split a name into two lines at "&" or the word boundary nearest the midpoint
const formatModuleName = (name) => {
  if (name.includes('\n')) return name.split('\n');
  const words = name.split(' ');
  if (words.length <= 2) return [name];
  const charMid = name.length / 2;
  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const line1Len = words.slice(0, i).join(' ').length;
    const diff = Math.abs(line1Len - charMid);
    if (diff < bestDiff) { bestDiff = diff; bestSplit = i; }
  }
  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
};

const ProgressGraph = ({
  userName = '',
  courseData = null,
  userLessonScores = {},
  // eslint-disable-next-line no-unused-vars -- kept in the prop contract; see the effectiveGlobalScores TODO below
  globalLessonScores = {},
  completedLessons = [],
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const lastTooltipDataRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [hovered, setHovered] = useState(null); // { m, l }
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  // Build nested module → lesson structure from the course's module_structure
  const modules = [];
  const allLessons = [];

  if (courseData?.module_structure && Array.isArray(courseData.module_structure)) {
    courseData.module_structure.forEach((mod, moduleIdx) => {
      const moduleNum = moduleIdx + 1;
      const modLessons = [];

      if (mod.lessons && Array.isArray(mod.lessons)) {
        mod.lessons.forEach((lesson, lessonIdx) => {
          const entry = {
            key: `${moduleNum}-${lessonIdx + 1}`,
            moduleNum,
            lessonNum: lessonIdx + 1,
            name: lesson.name || `Lesson ${lessonIdx + 1}`,
            flatIdx: allLessons.length,
          };
          modLessons.push(entry);
          allLessons.push(entry);
        });
      }

      // Modules with no lessons contribute no stack and no label
      if (modLessons.length > 0) {
        modules.push({ name: mod.name || `Module ${moduleNum}`, lessons: modLessons });
      }
    });
  }

  const hasLessons = allLessons.length > 0;

  // Reveal on scroll, never on page load — and only once the graph is actually
  // on screen, so it can't play out of sight.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !hasLessons) return;

    let scrolled = false;
    let visible = false;
    const cleanup = () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
    const maybeStart = () => {
      if (scrolled && visible) {
        setStarted(true);
        cleanup();
      }
    };
    function onScroll() {
      scrolled = true;
      maybeStart();
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        maybeStart();
      },
      { threshold: 0.35 }
    );

    window.addEventListener('scroll', onScroll, { passive: true });
    io.observe(el);
    return cleanup;
  }, [hasLessons]);

  const completedSet = new Set(
    (completedLessons || []).map(l => `${l.module_number}-${l.lesson_number}`)
  );

  // TODO: Switch to real global scores once we have data from 5+ users.
  // Until then, use deterministic placeholders (65–95% range) for all lessons.
  const effectiveGlobalScores = Object.fromEntries(
    allLessons.map((lesson) => {
      const hash = (lesson.moduleNum * 7 + lesson.lessonNum * 13) % 31;
      return [lesson.key, 65 + (hash / 31) * 30];
    })
  );

  const userScoreOf = (lesson) => {
    const r = userLessonScores[lesson.key];
    if (!r || !(r.total > 0) || !completedSet.has(lesson.key)) return null;
    return Math.max(0, Math.min(100, (r.correct / r.total) * 100));
  };

  const N = modules.length;
  // Band scale: every module gets a full slot, and N === 1 lands at 50%
  const centrePct = (i) => ((i + 0.5) / N) * 100;

  // "Current lesson" is the first one not yet completed — same definition
  // LessonSlider uses for its "Current Lesson" card. -1 once the course is done.
  const currentFlatIdx = allLessons.findIndex((lesson) => !completedSet.has(lesson.key));

  const G = isMobile ? MOBILE : DESKTOP;
  // Uniform across every module; only widened when there are so few stacks that
  // the normal width would look accidental.
  const rectW = N <= 2 ? G.wideW : G.rectW;
  const rectLeftPx = -(rectW / 2); // centred on the slot centre
  const pitch = G.rectH + G.gap; // row-to-row step
  // Only grows past the minimum if a module has more lessons than the blocks fit
  const maxLessons = Math.max(...modules.map((mod) => mod.lessons.length), 1);
  const graphH = Math.max(
    G.minGraphH,
    G.baseOffset + maxLessons * G.rectH + (maxLessons - 1) * G.gap + G.topPad
  );
  const tooltipTopPx = (graphH - TOOLTIP_H) / 2;

  if (!hasLessons) {
    return (
      <div ref={containerRef} className="w-full" style={{ marginTop: '8px' }}>
        {userName && (
          <h3 className="text-white font-semibold" style={{ fontSize: isMobile ? '1.4rem' : '1.6rem', letterSpacing: '0%', marginBottom: '4px' }}>
            {userName}'s Progress
          </h3>
        )}
        <p style={{ color: '#666', fontSize: '0.9rem' }}>No course data available.</p>
      </div>
    );
  }

  // Tooltip content for the hovered lesson
  const tooltipData = hovered ? (() => {
    const lesson = modules[hovered.m].lessons[hovered.l];
    const uScore = userScoreOf(lesson);
    const gScore = effectiveGlobalScores[lesson.key];
    // Point the arrow at the hovered row; the tooltip itself stays put
    const rowCentreFromTop =
      graphH - (G.baseOffset + hovered.l * pitch + G.rectH / 2);

    return {
      lessonName: lesson.name,
      userScore: uScore === null ? null : Math.round(uScore),
      globalScore: gScore === undefined || gScore === null ? null : Math.round(gScore),
      centre: centrePct(hovered.m),
      arrowTopPx: Math.max(12, Math.min(TOOLTIP_H - 12, rowCentreFromTop - tooltipTopPx)),
      side: hovered.m < N / 2 ? 'right' : 'left',
    };
  })() : null;

  if (tooltipData) lastTooltipDataRef.current = tooltipData;
  const displayTooltip = tooltipData || lastTooltipDataRef.current;

  return (
    <div ref={containerRef} className="w-full" style={{ marginTop: '8px' }}>
      {userName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <h3 className="text-white font-semibold" style={{ fontSize: isMobile ? '1.4rem' : '1.6rem', letterSpacing: '0%' }}>
            {userName}'s Progress
          </h3>
          <div
            style={{ position: 'relative', display: 'inline-flex' }}
            onMouseEnter={() => setShowScoreInfo(true)}
            onMouseLeave={() => setShowScoreInfo(false)}
          >
            <div style={{
              width: '16px', height: '16px',
              borderRadius: '2px',
              backgroundColor: '#888888',
              marginTop: '1px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
              cursor: 'pointer',
              color: '#fff',
            }}>
              <div style={{ width: '2.5px', height: '2.5px', borderRadius: '1px', backgroundColor: '#000', marginBottom: '2px' }} />
              <div style={{ width: '2.5px', height: '6px', borderRadius: '1px', backgroundColor: '#000' }} />
            </div>
            <div style={{
                position: 'absolute',
                left: 'calc(100% + 10px)',
                top: '50%',
                transform: 'translateY(-10%)',
                backgroundColor: '#171717',
                borderRadius: '3px',
                padding: '12px 17px',
                width: '231px',
                zIndex: 50,
                fontFamily: 'Geist, sans-serif',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                textAlign: 'center',
                opacity: showScoreInfo ? 1 : 0,
                pointerEvents: showScoreInfo ? 'auto' : 'none',
                transition: 'opacity 300ms ease',
              }}>
                <div style={{
                  position: 'absolute',
                  left: '-7px', top: '10%', transform: 'translateY(-50%)',
                  width: 0, height: 0,
                  borderTop: '7px solid transparent',
                  borderBottom: '7px solid transparent',
                  borderRight: '7px solid #171717',
                }} />
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Score Calculations
                </div>
                <div style={{ color: '#fff', fontWeight: 200, fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '8px' }}>
                  Lesson scores are the average from the individual section scores.
                  <br />
                  Brighter = higher score.
                </div>
                <div style={{ color: '#fff', fontWeight: 300, fontSize: '0.8rem', lineHeight: '1.4' }}>
                  Retake a lesson anytime.
                  <br />
                  We use your highest score.
                </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes block-reveal {
          from { opacity: 0; transform: translateY(${REVEAL_RISE}px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Brightness rather than opacity — block-reveal owns opacity, and a
           second animation touching it would fight the fade-in. */
        @keyframes pulse-current {
          0%, 100% { filter: brightness(1); }
          50%      { filter: brightness(1.5); }
        }
      `}</style>

      {/* Graph container — one stack of lesson rectangles per module */}
      <div
        style={{
          position: 'relative',
          height: `${graphH}px`,
          width: isMobile ? '95%' : '90%',
          maxWidth: '1500px',
          margin: '0 auto',
        }}
      >
        {modules.map((mod, m) => (
          <React.Fragment key={`mod-${m}`}>
            {/* One rect per lesson: pink (your score) once completed, otherwise
                grey (the course average). Brightness encodes whichever it is. */}
            {mod.lessons.map((lesson, l) => {
              const uScore = userScoreOf(lesson);
              const isDone = uScore !== null;
              // Row index only — the bottom lesson of every module goes first,
              // then the row above it, with no left-to-right sweep.
              const delay = l * ROW_STAGGER;
              const isHovered = hovered?.m === m && hovered?.l === l;
              const blockColor = isDone
                ? shade(PINK_RGB, uScore)
                : shade(GREY_RGB, effectiveGlobalScores[lesson.key]);
              return (
                <div
                  key={`rect-${m}-${l}`}
                  style={{
                    position: 'absolute',
                    left: `${centrePct(m)}%`,
                    marginLeft: `${rectLeftPx}px`,
                    bottom: `${G.baseOffset + l * pitch}px`,
                    width: `${rectW}px`,
                    height: `${G.rectH}px`,
                    borderRadius: `${G.radius}px`,
                    pointerEvents: 'none',
                    backgroundColor: blockColor,
                    // Hover emphasis is a ring in the block's own colour, not a
                    // transform — a CSS animation outranks inline styles, so an
                    // inline transform would be ignored.
                    boxShadow: isHovered ? `0 0 0 1px ${blockColor}` : 'none',
                    transition: 'box-shadow 0.2s ease',
                    ...(started
                      ? {
                          // Same shorthand the /welcome course cards use, with
                          // `opacity: 0` holding the block hidden until its turn
                          opacity: 0,
                          animation:
                            `block-reveal ${REVEAL_MS}ms ease-out ${delay}ms forwards` +
                            (lesson.flatIdx === currentFlatIdx
                              ? `, pulse-current 2s ease-in-out ${delay + REVEAL_MS}ms infinite backwards`
                              : ''),
                        }
                      : { opacity: 0 }),
                  }}
                />
              );
            })}

            {/* Hit targets — tile the full stack height so there are no dead
                bands. Real buttons so clicking (or Enter/Space) opens the lesson. */}
            {mod.lessons.map((lesson, l) => {
              const bottom = G.baseOffset + l * pitch;
              const halfGap = G.gap / 2;
              return (
                <button
                  key={`hit-${m}-${l}`}
                  type="button"
                  aria-label={`Open ${lesson.name}`}
                  onMouseEnter={() => setHovered({ m, l })}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered({ m, l })}
                  onBlur={() => setHovered(null)}
                  onClick={() =>
                    navigate(`/learning?module=${lesson.moduleNum}&lesson=${lesson.lessonNum}`)
                  }
                  style={{
                    position: 'absolute',
                    left: `${centrePct(m)}%`,
                    marginLeft: `${rectLeftPx - G.hitPadX}px`,
                    width: `${rectW + G.hitPadX * 2}px`,
                    bottom: l === 0 ? 0 : `${bottom - halfGap}px`,
                    height: l === 0 ? `${bottom + G.rectH + halfGap}px` : `${pitch}px`,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}

        {/* Tooltip popup on hover */}
        {displayTooltip && (
          <div
            style={{
              position: 'absolute',
              left: `${displayTooltip.centre}%`,
              top: `${tooltipTopPx}px`,
              transform: displayTooltip.side === 'right'
                ? `translateX(${rectW / 2 + 16}px)`
                : `translateX(calc(-100% - ${rectW / 2 + 16}px))`,
              backgroundColor: '#171717',
              borderRadius: '3px',
              padding: '12px 17px',
              width: '225px',
              height: `${TOOLTIP_H}px`,
              zIndex: 50,
              pointerEvents: 'none',
              fontFamily: 'Geist, sans-serif',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: tooltipData ? 1 : 0,
              transition: 'opacity 300ms ease',
            }}
          >
            {/* Arrow pointer */}
            <div
              style={{
                position: 'absolute',
                top: `${displayTooltip.arrowTopPx}px`,
                [displayTooltip.side === 'right' ? 'left' : 'right']: '-7px',
                transform: 'translateY(-7px)',
                width: 0,
                height: 0,
                borderTop: '7px solid transparent',
                borderBottom: '7px solid transparent',
                ...(displayTooltip.side === 'right'
                  ? { borderRight: '7px solid #171717' }
                  : { borderLeft: '7px solid #171717' }),
              }}
            />
            {/* Lesson name */}
            <div style={{
              color: '#fff',
              fontWeight: 500,
              fontSize: '0.85rem',
              lineHeight: '1.3',
              marginBottom: '5px',
            }}>
              {formatModuleName(displayTooltip.lessonName).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            {/* User's score — omitted entirely until the lesson is completed */}
            {displayTooltip.userScore !== null && (
              <div style={{
                color: '#EF0B72',
                fontWeight: 500,
                fontSize: '0.85rem',
                lineHeight: '1.3',
              }}>
                {userName}'s Score: {displayTooltip.userScore}%
              </div>
            )}
            {/* Global average */}
            {displayTooltip.globalScore !== null && (
              <div style={{
                color: '#fff',
                fontWeight: 200,
                fontSize: '0.85rem',
                lineHeight: '1.3',
              }}>
                Average Score: {displayTooltip.globalScore}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* HTML module labels — hidden on mobile (x-axis markers) */}
      {!isMobile && (
      <div style={{ position: 'relative', minHeight: '2.6em', width: '90%', maxWidth: '1500px', margin: '8px auto 0' }}>
        {modules.map((mod, idx) => {
          const lines = formatModuleName(mod.name);
          return (
            <div
              key={`label-${idx}`}
              style={{
                position: 'absolute',
                left: `${centrePct(idx)}%`,
                transform: 'translateX(-50%)',
                // The 12px gutter already keeps the outer labels 6px clear of the
                // container edges, so no extra inset is needed on the ends.
                width: `calc(${100 / N}% - 12px)`,
                textAlign: 'center',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 300,
                fontFamily: 'Geist, sans-serif',
                lineHeight: '1.3',
              }}
            >
              {lines.map((line, lineIdx) => (
                <div key={lineIdx}>{line}</div>
              ))}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};

export default ProgressGraph;
