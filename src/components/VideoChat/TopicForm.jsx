import React, { useState } from 'react';

const TopicForm = ({ lessons, onJoin, disabled }) => {
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');

  const canJoin = topic !== '' && question.trim().length > 0 && !disabled;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canJoin) {
      onJoin(topic, question.trim());
    }
  };

  // Group lessons by module
  const moduleGroups = {};
  if (lessons?.length) {
    lessons.forEach(l => {
      const mod = l.module_number;
      if (!moduleGroups[mod]) moduleGroups[mod] = [];
      moduleGroups[mod].push(l);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Topic selector */}
      <div>
        <label style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: '#333', marginBottom: '8px' }}>
          Topic
        </label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '0.9rem',
            borderRadius: '6px',
            border: '1px solid #ddd',
            backgroundColor: '#f9f9f9',
            color: topic ? '#333' : '#999',
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          <option value="" disabled>Select a topic...</option>
          {Object.entries(moduleGroups).map(([mod, modLessons]) => (
            <optgroup key={mod} label={`Module ${mod}`}>
              {modLessons.map(l => (
                <option key={`${l.module_number}-${l.lesson_number}`} value={l.lesson_name}>
                  {l.lesson_name}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Question input */}
      <div>
        <label style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: '#333', marginBottom: '8px' }}>
          Question
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Describe what you'd like to discuss..."
          rows={5}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '0.9rem',
            borderRadius: '6px',
            border: '1px solid #ddd',
            backgroundColor: '#f9f9f9',
            color: '#333',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Join button */}
      <button
        type="submit"
        disabled={!canJoin}
        style={{
          padding: '14px 32px',
          fontSize: '1rem',
          fontWeight: 600,
          borderRadius: '8px',
          border: 'none',
          backgroundColor: canJoin ? '#E91E63' : '#e0e0e0',
          color: canJoin ? 'white' : '#999',
          cursor: canJoin ? 'pointer' : 'not-allowed',
          transition: 'background-color 0.2s',
          alignSelf: 'center',
          minWidth: '220px',
        }}
      >
        Join Office Hours
      </button>
    </form>
  );
};

export default TopicForm;
