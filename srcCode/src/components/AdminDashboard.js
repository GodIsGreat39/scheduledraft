import React, { useState } from 'react';
import { theme, buttonStyles } from './calendarUtils';

// Minimal admin page to add coaches, slots, and set draft order.

const AdminDashboard = () => {
  const [coaches, setCoaches] = useState([]);
  const [newCoach, setNewCoach] = useState('');
  const [draftOrder, setDraftOrder] = useState([]);

  const addCoach = () => {
    if (newCoach.trim()) {
      setCoaches([...coaches, newCoach.trim()]);
      setNewCoach('');
    }
  };

  const moveCoach = (index, direction) => {
    const copy = [...draftOrder];
    const [item] = copy.splice(index, 1);
    copy.splice(index + direction, 0, item);
    setDraftOrder(copy);
  };

  return (
    <div style={{ padding: '20px 40px' }}>
      <h2 style={{ color: theme.text }}>Admin Dashboard</h2>
      <div style={{ backgroundColor: theme.background, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Quick Add Coach</h3>
        <input
          type="text"
          value={newCoach}
          onChange={(e) => setNewCoach(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, marginRight: '10px' }}
        />
        <button onClick={addCoach} style={{ ...buttonStyles.base, ...buttonStyles.primary }}>Add</button>
      </div>
      <div style={{ backgroundColor: theme.background, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3>Coaches</h3>
        <ul>
          {coaches.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
      <div style={{ backgroundColor: theme.background, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3>Draft Order</h3>
        <button
          onClick={() => setDraftOrder(coaches)}
          disabled={coaches.length === 0}
          style={{ ...buttonStyles.base, ...buttonStyles.secondary, marginBottom: '10px' }}
        >
          Start with coaches list
        </button>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {draftOrder.map((c, idx) => (
            <li key={idx} style={{ padding: '8px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {c}{' '}
              <div>
                <button
                  disabled={idx === 0}
                  onClick={() => moveCoach(idx, -1)}
                  style={{ ...buttonStyles.base, padding: '2px 6px', marginRight: '5px' }}
                >
                  ↑
                </button>
                <button
                  disabled={idx === draftOrder.length - 1}
                  onClick={() => moveCoach(idx, 1)}
                  style={{ ...buttonStyles.base, padding: '2px 6px' }}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
