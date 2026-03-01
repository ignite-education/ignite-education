import React, { useState, useEffect, useRef, useCallback } from 'react';

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 200;
const PADDING_X = 30;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 70;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

// Generate straight-line path through points
const generateStraightPath = (points) => {
  if (points.length < 2) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
};

// Generate smooth bezier path through points
const generateSmoothPath = (points) => {
  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const tension = 0.35;

    const cp1x = curr.x + (next.x - curr.x) * tension;
    const cp1y = curr.y;
    const cp2x = next.x - (next.x - curr.x) * tension;
    const cp2y = next.y;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  return d;
};

const ProgressGraph = ({
  userName = '',
  courseData = null,
  userLessonScores = {},
  globalLessonScores = {},
}) => {
  // Build flat lesson list and module ranges from course structure
  const lessons = [];
  const moduleRanges = [];

  if (courseData?.module_structure && Array.isArray(courseData.module_structure)) {
    courseData.module_structure.forEach((mod, moduleIdx) => {
      const moduleNum = moduleIdx + 1;
      const startIdx = lessons.length;

      if (mod.lessons && Array.isArray(mod.lessons)) {
        mod.lessons.forEach((lesson, lessonIdx) => {
          lessons.push({
            key: `${moduleNum}-${lessonIdx + 1}`,
            moduleNum,
            lessonNum: lessonIdx + 1,
            name: lesson.name || `Lesson ${lessonIdx + 1}`,
          });
        });
      }

      const endIdx = lessons.length - 1;
      if (endIdx >= startIdx) {
        moduleRanges.push({
          name: mod.name || `Module ${moduleNum}`,
          startIdx,
          endIdx,
        });
      }
    });
  }

  if (lessons.length === 0) {
    return (
      <div className="w-full" style={{ marginTop: '8px' }}>
        {userName && (
          <h3 className="text-white font-semibold" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '4px' }}>
            {userName}'s Progress
          </h3>
        )}
        <p style={{ color: '#666', fontSize: '0.9rem' }}>No course data available.</p>
      </div>
    );
  }

  // TODO: Switch to real global scores once we have data from 5+ users.
  // Until then, use deterministic placeholders (65–95% range) for all lessons.
  const effectiveGlobalScores = Object.fromEntries(
    lessons.map((lesson) => {
      const hash = (lesson.moduleNum * 7 + lesson.lessonNum * 13) % 31;
      return [lesson.key, 65 + (hash / 31) * 30];
    })
  );

  const graphWidth = SVG_WIDTH - PADDING_X * 2;
  const baseY = PADDING_TOP + GRAPH_HEIGHT;

  // Compute x-positions with gaps between modules
  const MODULE_GAP = 1.5; // gap between modules expressed as multiple of lesson spacing
  const totalGaps = moduleRanges.length > 1 ? (moduleRanges.length - 1) * MODULE_GAP : 0;
  const totalSlots = (lessons.length - moduleRanges.length) + totalGaps;
  const unitWidth = totalSlots > 0 ? graphWidth / totalSlots : graphWidth;

  const lessonX = [];
  let cursor = 0;
  moduleRanges.forEach((mod, modIdx) => {
    for (let i = mod.startIdx; i <= mod.endIdx; i++) {
      lessonX[i] = PADDING_X + cursor * unitWidth;
      if (i < mod.endIdx) cursor += 1; // within-module step
    }
    if (modIdx < moduleRanges.length - 1) cursor += MODULE_GAP; // inter-module gap
  });

  // Scroll-triggered animation for pink user dots
  const containerRef = useRef(null);
  const [animationProgress, setAnimationProgress] = useState(-1); // -1 = not started
  const hasTriggeredRef = useRef(false);
  const [hoveredLessonIdx, setHoveredLessonIdx] = useState(null);
  const graphRef = useRef(null);

  // Find closest lesson by mouse x-position within module line boundaries
  const handleGraphMouseMove = useCallback((e) => {
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseXPct = (e.clientX - rect.left) / rect.width;
    const mouseXSvg = mouseXPct * SVG_WIDTH;

    let closest = null;
    let closestDist = Infinity;

    moduleRanges.forEach((mod) => {
      const modLeftX = lessonX[mod.startIdx];
      const modRightX = lessonX[mod.endIdx];
      // Only match if mouse is within this module's horizontal span
      if (mouseXSvg < modLeftX - unitWidth * 0.5 || mouseXSvg > modRightX + unitWidth * 0.5) return;

      for (let i = mod.startIdx; i <= mod.endIdx; i++) {
        const dist = Math.abs(lessonX[i] - mouseXSvg);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
    });

    setHoveredLessonIdx(closest);
  }, [moduleRanges, lessonX, unitWidth]);

  const handleGraphMouseLeave = useCallback(() => {
    setHoveredLessonIdx(null);
  }, []);

  useEffect(() => {
    const startAnimation = () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      const startTime = performance.now();
      const duration = 1500;
      const animate = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        setAnimationProgress(eased);
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    };
    window.addEventListener('scroll', startAnimation, { once: true });
    return () => window.removeEventListener('scroll', startAnimation);
  }, []);

  // Build data points for both series
  const animationStarted = animationProgress >= 0;
  const progress = animationStarted ? animationProgress : 0;
  // Interpolate colors from 50% darker starting values to final values
  const dark = 0.5 + 0.5 * progress; // 0.5 → 1.0
  const greyChannel = Math.round(0x88 * dark);
  const greyColor = `rgb(${greyChannel},${greyChannel},${greyChannel})`;
  const pinkColor = `rgb(${Math.round(0xEF * dark)},${Math.round(0x0B * dark)},${Math.round(0x72 * dark)})`;

  const globalPoints = lessons.map((lesson, idx) => {
    const score = effectiveGlobalScores[lesson.key];
    const hasData = score !== undefined && score !== null;
    const progress = animationStarted ? animationProgress : 0;
    const displayScore = hasData ? 65 + (score - 65) * progress : null;
    return {
      x: lessonX[idx],
      y: hasData ? PADDING_TOP + GRAPH_HEIGHT - (displayScore / 100) * GRAPH_HEIGHT : null,
      score: displayScore,
      hasData,
    };
  });
  const userPoints = lessons.map((lesson, idx) => {
    const result = userLessonScores[lesson.key];
    const hasData = result && result.total > 0;
    const actualScore = hasData ? (result.correct / result.total) * 100 : null;
    const progress = animationStarted ? animationProgress : 0;
    // Interpolate from 65% to actual score based on animation progress
    const displayScore = hasData ? 65 + (actualScore - 65) * progress : null;
    return {
      x: lessonX[idx],
      y: hasData ? PADDING_TOP + GRAPH_HEIGHT - (displayScore / 100) * GRAPH_HEIGHT : null,
      score: displayScore,
      hasData,
    };
  });

  // Generate separate paths per module (no lines across module boundaries)
  const globalPaths = moduleRanges.map((mod) => {
    const points = globalPoints.slice(mod.startIdx, mod.endIdx + 1).filter((p) => p.hasData);
    return points.length >= 2 ? generateStraightPath(points) : '';
  }).filter(Boolean);

  const userPaths = moduleRanges.map((mod) => {
    const points = userPoints.slice(mod.startIdx, mod.endIdx + 1).filter((p) => p.hasData);
    return points.length >= 2 ? generateStraightPath(points) : '';
  }).filter(Boolean);

  // Split module name into two lines at "&" or midpoint
  const formatModuleName = (name) => {
    if (name.includes('\n')) return name.split('\n');
    const words = name.split(' ');
    if (words.length <= 2) return [name];
    // Split at the word boundary closest to the character midpoint
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

  // Compute center percentage for each module label (midpoint between first & last dot)
  const moduleCenters = moduleRanges.map((mod) => {
    const leftX = lessonX[mod.startIdx];
    const rightX = lessonX[mod.endIdx];
    return ((leftX + rightX) / 2) / SVG_WIDTH * 100;
  });

  // Tooltip data for hovered lesson
  const tooltipData = hoveredLessonIdx !== null ? (() => {
    const gp = globalPoints[hoveredLessonIdx];
    const up = userPoints[hoveredLessonIdx];
    const anchorX = gp?.x ?? up?.x ?? 0;
    // Anchor vertically at the higher (smaller y) of the two dots
    const anchorY = Math.min(
      gp?.hasData ? gp.y : Infinity,
      up?.hasData ? up.y : Infinity,
    );
    const effectiveAnchorY = anchorY === Infinity ? 60 : anchorY;
    // Dot's pixel y in the 120px graph container
    const dotYPx = (effectiveAnchorY / (PADDING_TOP + GRAPH_HEIGHT + 10)) * 120;
    // Tooltip top edge: centered at 48px (40% of 120px), half of 100px height = -2px
    const tooltipTopPx = 48 - 50;
    const arrowTopPx = Math.max(12, Math.min(88, dotYPx - tooltipTopPx));

    return {
      lessonName: lessons[hoveredLessonIdx]?.name || `Lesson ${hoveredLessonIdx + 1}`,
      userScore: up?.hasData ? Math.round(up.score) : null,
      globalScore: gp?.hasData ? Math.round(gp.score) : null,
      anchorX,
      arrowTopPx,
      side: hoveredLessonIdx < lessons.length / 2 ? 'right' : 'left',
    };
  })() : null;

  return (
    <div ref={containerRef} className="w-full" style={{ marginTop: '8px' }}>
      {userName && (
        <h3 className="text-white font-semibold" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '4px' }}>
          {userName}'s Progress
        </h3>
      )}

      {/* Graph container — SVG lines + HTML dots overlay */}
      <div
        ref={graphRef}
        onMouseMove={handleGraphMouseMove}
        onMouseLeave={handleGraphMouseLeave}
        style={{ position: 'relative', height: '120px', cursor: 'pointer', width: '90%', margin: '0 auto' }}
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${PADDING_TOP + GRAPH_HEIGHT + 10}`}
          className="w-full"
          style={{ height: '120px' }}
          preserveAspectRatio="none"
        >
          {/* Global average lines (dashed grey, per module) */}
          {globalPaths.map((d, i) => (
            <path
              key={`gpath-${i}`}
              d={d}
              fill="none"
              stroke={greyColor}
              strokeWidth="2"
              strokeDasharray="3 3.5"
            />
          ))}

          {/* User score lines (solid pink, per module) */}
          {userPaths.map((d, i) => (
            <path
              key={`upath-${i}`}
              d={d}
              fill="none"
              stroke={pinkColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}

          {/* Vertical hover indicator line */}
          {hoveredLessonIdx !== null && lessonX[hoveredLessonIdx] !== undefined && (
            <line
              x1={lessonX[hoveredLessonIdx]}
              y1={PADDING_TOP - GRAPH_HEIGHT * 0.05}
              x2={lessonX[hoveredLessonIdx]}
              y2={baseY + 8}
              stroke="#333"
              strokeWidth="1"
            />
          )}

          {/* Horizontal separator */}
          <line
            x1={0}
            y1={baseY + 8}
            x2={SVG_WIDTH}
            y2={baseY + 8}
            stroke="#fff"
            strokeWidth="1"
          />
        </svg>

        {/* HTML dots — immune to SVG non-uniform scaling */}
        {globalPoints.map((point, i) =>
          point.hasData ? (
            <div
              key={`global-${i}`}
              style={{
                position: 'absolute',
                left: `${(point.x / SVG_WIDTH) * 100}%`,
                top: `${(point.y / (PADDING_TOP + GRAPH_HEIGHT + 10)) * 120}px`,
                width: '7px',
                height: '7px',
                transform: `translate(-50%, -50%) scale(${hoveredLessonIdx === i ? 1.3 : 1})`,
                transition: 'transform 0.4s ease',
                backgroundColor: greyColor,
                borderRadius: '1px',
                pointerEvents: 'none',
              }}
            />
          ) : null
        )}
        {userPoints.map((point, i) =>
          point.hasData ? (
            <div
              key={`user-${i}`}
              style={{
                position: 'absolute',
                left: `${(point.x / SVG_WIDTH) * 100}%`,
                top: `${(point.y / (PADDING_TOP + GRAPH_HEIGHT + 10)) * 120}px`,
                width: '7px',
                height: '7px',
                transform: `translate(-50%, -50%) scale(${hoveredLessonIdx === i ? 1.3 : 1})`,
                transition: 'transform 0.4s ease',
                backgroundColor: pinkColor,
                borderRadius: '1px',
                pointerEvents: 'none',
              }}
            />
          ) : null
        )}

        {/* Tooltip popup on hover */}
        {tooltipData && (
          <div
            style={{
              position: 'absolute',
              left: `${(tooltipData.anchorX / SVG_WIDTH) * 100}%`,
              top: '40%',
              transform: tooltipData.side === 'right'
                ? 'translate(16px, -50%)'
                : 'translate(calc(-100% - 16px), -50%)',
              backgroundColor: '#171717',
              borderRadius: '3px',
              padding: '12px 17px',
              width: '225px',
              height: '100px',
              zIndex: 50,
              pointerEvents: 'none',
              fontFamily: 'Geist, sans-serif',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Arrow pointer */}
            <div
              style={{
                position: 'absolute',
                top: `${tooltipData.arrowTopPx}px`,
                [tooltipData.side === 'right' ? 'left' : 'right']: '-7px',
                transform: 'translateY(-7px)',
                width: 0,
                height: 0,
                borderTop: '7px solid transparent',
                borderBottom: '7px solid transparent',
                ...(tooltipData.side === 'right'
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
              {formatModuleName(tooltipData.lessonName).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            {/* User's score */}
            {tooltipData.userScore !== null && (
              <div style={{
                color: '#EF0B72',
                fontWeight: 500,
                fontSize: '0.85rem',
                lineHeight: '1.3',
              }}>
                {userName}'s Score: {tooltipData.userScore}%
              </div>
            )}
            {/* Global average */}
            {tooltipData.globalScore !== null && (
              <div style={{
                color: '#fff',
                fontWeight: 200,
                fontSize: '0.85rem',
                lineHeight: '1.3',
              }}>
                Average Score: {tooltipData.globalScore}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* HTML module labels — absolutely positioned at midpoint of each module's dots */}
      <div style={{ position: 'relative', marginTop: '8px', height: '2.4em', width: '90%', margin: '8px auto 0' }}>
        {moduleRanges.map((mod, idx) => {
          const lines = formatModuleName(mod.name);
          return (
            <div
              key={`label-${idx}`}
              style={{
                position: 'absolute',
                left: `${moduleCenters[idx]}%`,
                transform: 'translateX(-50%)',
                textAlign: 'center',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 300,
                fontFamily: 'Geist, sans-serif',
                lineHeight: '1.3',
                whiteSpace: 'nowrap',
              }}
            >
              {lines.map((line, lineIdx) => (
                <div key={lineIdx}>{line}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressGraph;
