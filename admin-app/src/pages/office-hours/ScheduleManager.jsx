import { CalendarPlus, Trash2 } from 'lucide-react';

const ScheduleManager = ({
  scheduledSlots,
  scheduleDate,
  scheduleStartTime,
  scheduleEndTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onAddSlot,
  onDeleteSlot,
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

  return (
    <div>
      <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
        <CalendarPlus size={18} className="text-gray-400" />
        Upcoming Schedule
      </h2>

      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Date</label>
          <input
            type="date"
            value={scheduleDate}
            min={todayStr}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Start</label>
          <input
            type="time"
            value={scheduleStartTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">End</label>
          <input
            type="time"
            value={scheduleEndTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          onClick={onAddSlot}
          disabled={addingSlot}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <CalendarPlus size={15} />
          {addingSlot ? 'Adding...' : 'Add'}
        </button>
      </div>

      {scheduledSlots.length === 0 ? (
        <p className="text-gray-500 text-sm">No upcoming sessions scheduled.</p>
      ) : (
        <div className="space-y-2">
          {scheduledSlots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-700/50 bg-gray-800/30"
            >
              <span className="text-sm text-gray-300">{formatScheduleSlot(slot)}</span>
              <button
                onClick={() => onDeleteSlot(slot.id)}
                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                title="Remove"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
