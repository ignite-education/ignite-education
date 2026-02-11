import React from 'react';

// Mocked module scores for initial development
const MOCK_MODULE_SCORES = [
  { module: 1, label: 'Foundations of\nProduct Management', score: 72 },
  { module: 2, label: 'Strategic Thinking\n& Planning', score: 85 },
  { module: 3, label: 'Design &\nUser Experience', score: 78 },
  { module: 4, label: 'Agile & Technical\nProficiency', score: 91 },
  { module: 5, label: 'Data Driven\nDecision Making', score: 65 },
  { module: 6, label: 'Go-to-Market &\nGrowth Strategies', score: null },
  { module: 7, label: 'Emerging Technologies\n& AI Alignment', score: null },
  { module: 8, label: 'Leadership &\nCareer Development', score: null },
];

const SVG_WIDTH = 900;
const SVG_HEIGHT = 180;
const PADDING_X = 50;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 60;
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

const ProgressGraph = ({ modules = MOCK_MODULE_SCORES, userName = '' }) => {
  const graphWidth = SVG_WIDTH - PADDING_X * 2;
  const spacing = graphWidth / (modules.length - 1);
  const baseY = PADDING_TOP + GRAPH_HEIGHT;

  // Separate completed and incomplete modules
  const completedModules = modules.filter(m => m.score !== null);
  const hasIncomplete = modules.some(m => m.score === null);

  // Generate points for completed modules
  const completedPoints = completedModules.map((m, i) => ({
    x: PADDING_X + i * spacing,
    y: PADDING_TOP + GRAPH_HEIGHT - (m.score / 100) * GRAPH_HEIGHT,
    score: m.score,
  }));

  // Generate path
  const linePath = completedPoints.length >= 2 ? generateSmoothPath(completedPoints) : '';

  // Create fill path (area under curve)
  const fillPath = linePath
    ? `${linePath} L ${completedPoints[completedPoints.length - 1].x} ${baseY} L ${completedPoints[0].x} ${baseY} Z`
    : '';

  // Dashed line for incomplete modules
  const lastCompletedPoint = completedPoints[completedPoints.length - 1];
  const incompleteStartIndex = completedModules.length;

  return (
    <div className="w-full" style={{ marginTop: '8px' }}>
      {userName && (
        <h3 className="text-white font-semibold" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '4px' }}>
          {userName}'s Progress
        </h3>
      )}
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full"
        style={{ maxHeight: '200px' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF0B72" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EF0B72" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EF0B72" />
            <stop offset="100%" stopColor="#EF0B72" />
          </linearGradient>
        </defs>

        {/* Fill area under curve */}
        {fillPath && (
          <path d={fillPath} fill="url(#graphFill)" />
        )}

        {/* Main curve line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Dashed line for incomplete modules */}
        {hasIncomplete && lastCompletedPoint && (
          <line
            x1={lastCompletedPoint.x}
            y1={lastCompletedPoint.y}
            x2={PADDING_X + (modules.length - 1) * spacing}
            y2={baseY - GRAPH_HEIGHT * 0.3}
            stroke="#555"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.5"
          />
        )}

        {/* Data points */}
        {completedPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#EF0B72"
            stroke="black"
            strokeWidth="2"
          />
        ))}

        {/* Incomplete module markers */}
        {modules.map((m, i) => {
          if (m.score !== null) return null;
          const x = PADDING_X + i * spacing;
          return (
            <circle
              key={`inc-${i}`}
              cx={x}
              cy={baseY - GRAPH_HEIGHT * 0.3}
              r="3"
              fill="#555"
              opacity="0.5"
            />
          );
        })}

        {/* Module labels */}
        {modules.map((m, i) => {
          const x = PADDING_X + i * spacing;
          const lines = m.label.split('\n');
          const isComplete = m.score !== null;
          return (
            <g key={`label-${i}`}>
              {lines.map((line, lineIdx) => (
                <text
                  key={lineIdx}
                  x={x}
                  y={baseY + 18 + lineIdx * 13}
                  textAnchor="middle"
                  fill={isComplete ? '#ccc' : '#666'}
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
