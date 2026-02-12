import React from 'react';

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 200;
const PADDING_X = 30;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 70;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

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

  const graphWidth = SVG_WIDTH - PADDING_X * 2;
  const spacing = lessons.length > 1 ? graphWidth / (lessons.length - 1) : graphWidth;
  const baseY = PADDING_TOP + GRAPH_HEIGHT;

  // Build data points for both series
  const globalPoints = lessons.map((lesson, idx) => {
    const score = globalLessonScores[lesson.key];
    const hasData = score !== undefined && score !== null;
    return {
      x: PADDING_X + idx * spacing,
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
      x: PADDING_X + idx * spacing,
      y: hasData ? PADDING_TOP + GRAPH_HEIGHT - (score / 100) * GRAPH_HEIGHT : null,
      score,
      hasData,
    };
  });

  // Filter to points that have data for path generation
  const validGlobalPoints = globalPoints.filter((p) => p.hasData);
  const validUserPoints = userPoints.filter((p) => p.hasData);

  const globalPath = validGlobalPoints.length >= 2 ? generateSmoothPath(validGlobalPoints) : '';
  const userPath = validUserPoints.length >= 2 ? generateSmoothPath(validUserPoints) : '';

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
        {/* Global average line (dashed grey) */}
        {globalPath && (
          <path
            d={globalPath}
            fill="none"
            stroke="#888"
            strokeWidth="2"
            strokeDasharray="6 4"
            opacity="0.6"
          />
        )}

        {/* User score line (solid pink) */}
        {userPath && (
          <path
            d={userPath}
            fill="none"
            stroke="#EF0B72"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Global average dots (grey) */}
        {globalPoints.map((point, i) =>
          point.hasData ? (
            <rect
              key={`global-${i}`}
              x={point.x - 3}
              y={point.y - 3}
              width={6}
              height={6}
              fill="#888"
              opacity="0.7"
              transform={`rotate(45, ${point.x}, ${point.y})`}
            />
          ) : null
        )}

        {/* User score dots (pink) */}
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
              transform={`rotate(45, ${point.x}, ${point.y})`}
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
          const startX = PADDING_X + mod.startIdx * spacing;
          const endX = PADDING_X + mod.endIdx * spacing;
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
                  fill="#999"
                  fontSize="10"
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
