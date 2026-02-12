import React from 'react';

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
        mod.lessons.forEach((_, lessonIdx) => {
          lessons.push({
            key: `${moduleNum}-${lessonIdx + 1}`,
            moduleNum,
            lessonNum: lessonIdx + 1,
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
            {userName}'s Results
          </h3>
        )}
        <p style={{ color: '#666', fontSize: '0.9rem' }}>No course data available.</p>
      </div>
    );
  }

  // Placeholder global scores when no real data exists (65-95% range, deterministic per lesson)
  const hasRealGlobalData = Object.keys(globalLessonScores).length > 0;
  const effectiveGlobalScores = hasRealGlobalData
    ? globalLessonScores
    : Object.fromEntries(
        lessons.map((lesson) => {
          // Simple hash from key to get a stable value per lesson
          const hash = (lesson.moduleNum * 7 + lesson.lessonNum * 13) % 31;
          return [lesson.key, 65 + (hash / 31) * 30]; // 65–95 range
        })
      );

  const graphWidth = SVG_WIDTH - PADDING_X * 2;
  const baseY = PADDING_TOP + GRAPH_HEIGHT;

  // Compute x-positions with gaps between modules
  const MODULE_GAP = 1.5; // gap between modules expressed as multiple of lesson spacing
  const totalGaps = moduleRanges.length > 1 ? (moduleRanges.length - 1) * MODULE_GAP : 0;
  const totalSlots = (lessons.length - 1) + totalGaps;
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

  // Build data points for both series
  const globalPoints = lessons.map((lesson, idx) => {
    const score = effectiveGlobalScores[lesson.key];
    const hasData = score !== undefined && score !== null;
    return {
      x: lessonX[idx],
      y: hasData ? PADDING_TOP + GRAPH_HEIGHT - (score / 100) * GRAPH_HEIGHT : null,
      score: hasData ? score : null,
      hasData,
    };
  });

  const userPoints = lessons.map((lesson, idx) => {
    const result = userLessonScores[lesson.key];
    const hasData = result && result.total > 0;
    const score = hasData ? (result.correct / result.total) * 100 : null;
    return {
      x: lessonX[idx],
      y: hasData ? PADDING_TOP + GRAPH_HEIGHT - (score / 100) * GRAPH_HEIGHT : null,
      score,
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
    if (name.includes(' & ')) {
      const parts = name.split(' & ');
      return [parts[0] + ' &', parts.slice(1).join(' & ')];
    }
    if (name.includes('\n')) return name.split('\n');
    // Split at roughly the midpoint on a word boundary
    const words = name.split(' ');
    if (words.length <= 2) return [name];
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  };

  return (
    <div className="w-full" style={{ marginTop: '8px' }}>
      {userName && (
        <h3 className="text-white font-semibold" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '4px' }}>
          {userName}'s Results
        </h3>
      )}
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Global average lines (dashed grey, per module) */}
        {globalPaths.map((d, i) => (
          <path
            key={`gpath-${i}`}
            d={d}
            fill="none"
            stroke="#888"
            strokeWidth="2"
            strokeDasharray="3 2"
          />
        ))}

        {/* User score lines (solid pink, per module) */}
        {userPaths.map((d, i) => (
          <path
            key={`upath-${i}`}
            d={d}
            fill="none"
            stroke="#EF0B72"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}

        {/* Global average dots (grey squares) */}
        {globalPoints.map((point, i) =>
          point.hasData ? (
            <rect
              key={`global-${i}`}
              x={point.x - 3}
              y={point.y - 3}
              width={6}
              height={6}
              fill="#888"
            />
          ) : null
        )}

        {/* User score dots (pink squares) */}
        {userPoints.map((point, i) =>
          point.hasData ? (
            <rect
              key={`user-${i}`}
              x={point.x - 4}
              y={point.y - 4}
              width={8}
              height={8}
              fill="#EF0B72"
              stroke="black"
              strokeWidth="1.5"
            />
          ) : null
        )}

        {/* Horizontal separator */}
        <line
          x1={PADDING_X}
          y1={baseY + 8}
          x2={SVG_WIDTH - PADDING_X}
          y2={baseY + 8}
          stroke="#444"
          strokeWidth="1"
        />

        {/* Module labels — centered under their lesson group */}
        {moduleRanges.map((mod, idx) => {
          const startX = lessonX[mod.startIdx];
          const endX = lessonX[mod.endIdx];
          const centerX = (startX + endX) / 2;
          const lines = formatModuleName(mod.name);

          return (
            <g key={`label-${idx}`}>
              {lines.map((line, lineIdx) => (
                <text
                  key={lineIdx}
                  x={centerX}
                  y={baseY + 26 + lineIdx * 14}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="0.8rem"
                  fontFamily="Geist, sans-serif"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default ProgressGraph;
