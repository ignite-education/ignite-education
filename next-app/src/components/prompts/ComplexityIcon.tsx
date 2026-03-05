export default function ComplexityIcon({ level }: { level: 'Low' | 'Mid' | 'High' }) {
  const bars = level === 'Low' ? 1 : level === 'Mid' ? 2 : 3
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="9" width="3" height="4" rx="0.5" fill={bars >= 1 ? '#7500F1' : '#D1D5DB'} />
      <rect x="5.5" y="5.5" width="3" height="7.5" rx="0.5" fill={bars >= 2 ? '#7500F1' : '#D1D5DB'} />
      <rect x="10" y="1" width="3" height="12" rx="0.5" fill={bars >= 3 ? '#7500F1' : '#D1D5DB'} />
    </svg>
  )
}
