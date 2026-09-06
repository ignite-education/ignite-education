import { CalendarPlus, Repeat, Trash2, X } from 'lucide-react';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const INTERVALS = [
  { value: 1, label: 'Every week' },
  { value: 2, label: 'Every 2 weeks' },
  { value: 4, label: 'Every 4 weeks' },
];

const inputClass =
  'bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-500';

const ScheduleManager = ({
  scheduledSlots,
  recurringRules,
  scheduleMode,
  onModeChange,
  scheduleDate,
  scheduleStartTime,
  scheduleEndTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  recurringDays,
  recurringInterval,
  recurringUntil,
  onToggleDay,
  onIntervalChange,
  onUntilChange,
  onAddSlot,
  onAddRecurring,
  onDeleteSlot,
  onDeleteSeries,
  onSkipOccurrence,
  addingSlot,
  todayStr,
}) => {
  const formatScheduleSlot = (slot) => {
    const start = new Date(slot.starts_at);
    const end = new Date(slot.ends_at);
    const dateStr = start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const startTime = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr}, ${startTime} - ${endTime}`;
  };

  const formatUntil = (dateStr) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
        <CalendarPlus size={18} className="text-gray-600" />
        Upcoming Schedule
      </h2>

      {/* Mode switch */}
      <div className="inline-flex p-0.5 mb-4 rounded-lg bg-gray-100 border border-gray-200">
        {[
          { value: 'once', label: 'One-off' },
          { value: 'recurring', label: 'Repeating' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => onModeChange(option.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              scheduleMode === option.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {scheduleMode === 'once' ? (
        <div className="flex items-end gap-3 mb-6">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={scheduleDate}
              min={todayStr}
              onChange={(e) => onDateChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Start</label>
            <input
              type="time"
              value={scheduleStartTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">End</label>
            <input
              type="time"
              value={scheduleEndTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            onClick={onAddSlot}
            disabled={addingSlot}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 text-white"
          >
            <CalendarPlus size={15} />
            {addingSlot ? 'Adding...' : 'Add'}
          </button>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
          <label className="block text-xs text-gray-600 mb-2">Repeats on</label>
          <div className="flex gap-2 mb-4">
            {DAY_LABELS.map((label, day) => (
              <button
                key={day}
                onClick={() => onToggleDay(day)}
                title={DAY_NAMES[day]}
                aria-pressed={recurringDays.includes(day)}
                className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                  recurringDays.includes(day)
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start</label>
              <input
                type="time"
                value={scheduleStartTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End</label>
              <input
                type="time"
                value={scheduleEndTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Frequency</label>
              <select
                value={recurringInterval}
                onChange={(e) => onIntervalChange(Number(e.target.value))}
                className={inputClass}
              >
                {INTERVALS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Until (optional)</label>
              <input
                type="date"
                value={recurringUntil}
                min={todayStr}
                onChange={(e) => onUntilChange(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              onClick={onAddRecurring}
              disabled={addingSlot}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 text-white"
            >
              <Repeat size={15} />
              {addingSlot ? 'Adding...' : 'Add series'}
            </button>
          </div>
        </div>
      )}

      {/* Active repeating series */}
      {recurringRules.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Repeating</h3>
          <div className="space-y-2">
            {recurringRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-purple-200 bg-purple-50"
              >
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Repeat size={15} className="text-purple-600 flex-shrink-0" />
                  <span>{rule.summary}</span>
                  {rule.ends_on && (
                    <span className="text-gray-500">· until {formatUntil(rule.ends_on)}</span>
                  )}
                </div>
                <button
                  onClick={() => onDeleteSeries(rule.id)}
                  className="text-gray-500 hover:text-red-700 transition-colors p-1"
                  title="Remove the whole series"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next sessions — one-offs and expanded occurrences */}
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Next up</h3>
      {scheduledSlots.length === 0 ? (
        <p className="text-gray-500 text-sm">No upcoming sessions scheduled.</p>
      ) : (
        <div className="space-y-2">
          {scheduledSlots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-gray-50"
            >
              <span className="text-sm text-gray-700 flex items-center gap-2">
                {formatScheduleSlot(slot)}
                {slot.recurring && (
                  <span className="flex items-center gap-1 text-xs text-purple-700 bg-purple-100 rounded-full px-2 py-0.5">
                    <Repeat size={11} />
                    Repeats
                  </span>
                )}
              </span>
              <button
                onClick={() =>
                  slot.recurring
                    ? onSkipOccurrence(slot.recurrence_id, slot.occurrence_date)
                    : onDeleteSlot(slot.id)
                }
                className="text-gray-500 hover:text-red-700 transition-colors p-1"
                title={slot.recurring ? 'Cancel just this session' : 'Remove'}
              >
                {slot.recurring ? <X size={15} /> : <Trash2 size={15} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
