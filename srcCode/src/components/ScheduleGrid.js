import React, { useMemo } from 'react';
import { theme, buttonStyles } from './calendarUtils';

const DraggablePriority = ({ priority, onDragStart, color }) => (
  <div
    draggable
    onDragStart={onDragStart}
    style={{
      padding: '6px 8px',
      backgroundColor: color || theme.primary,
      color: 'white',
      borderRadius: 4,
      fontWeight: 600,
      cursor: 'grab',
      textAlign: 'center',
      minWidth: 40,
    }}
  >
    {priority}
  </div>
);

const ScheduleGrid = ({
  slotsByDay,
  days,
  uniqueTimes,
  preferences,
  totalSlots,
  groupKey,
  onDrop,
  onAutoComplete,
  headerColor = theme.primary,
}) => {
  const assignedPriorities = useMemo(() => {
    const set = new Set();
    Object.values(preferences).forEach((p) => {
      if (p.priority) set.add(parseInt(p.priority));
    });
    return set;
  }, [preferences]);

  const poolList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= totalSlots; i++) {
      if (!assignedPriorities.has(i)) {
        list.push({ id: i, priority: i });
      }
    }
    return list;
  }, [totalSlots, assignedPriorities]);

  const handleDragStart = (e, priority, slotOrder = null) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ priority, slotOrder }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetSlotOrder) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      onDrop(data.slotOrder, targetSlotOrder, data.priority);
    } catch (err) {
      console.error('Drop error', err);
    }
  };

  return (
    <div style={{ flex: 1 }}>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          backgroundColor: theme.background,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: headerColor }}>
            <th
              style={{
                padding: 12,
                color: 'white',
                fontWeight: 600,
                textAlign: 'left',
                borderRight: `1px solid ${theme.border}`,
              }}
            >
              Time
            </th>
            {days.map((day) => (
              <th
                key={day}
                style={{
                  padding: 12,
                  color: 'white',
                  fontWeight: 600,
                  textAlign: 'center',
                  borderRight: `1px solid rgba(255,255,255,0.2)`,
                }}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {uniqueTimes.map((time, timeIdx) => (
            <tr
              key={time}
              style={{
                backgroundColor: timeIdx % 2 === 0 ? '#fff' : theme.light,
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <td
                style={{
                  padding: '12px',
                  fontSize: '0.95em',
                  fontWeight: 500,
                  color: theme.text,
                  borderRight: `1px solid ${theme.border}`,
                }}
              >
                {time}
              </td>
              {days.map((day) => {
                const slotsForDayTime = slotsByDay[day].filter(
                  (s) => s.slotTime === time
                );
                if (slotsForDayTime.length === 0) {
                  return (
                    <td
                      key={day}
                      style={{
                        borderRight: `1px solid ${theme.border}`,
                      }}
                    ></td>
                  );
                }
                const slot = slotsForDayTime[0];
                const pref = preferences[slot.slotOrder] || {};

                return (
                  <td
                    key={day}
                    style={{
                      padding: '8px',
                      textAlign: 'center',
                      borderRight: `1px solid ${theme.border}`,
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, String(slot.slotOrder))}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 42, justifyContent: 'center' }}>
                      {pref.priority ? (
                        <DraggablePriority
                          priority={pref.priority}
                          onDragStart={(e) => handleDragStart(e, pref.priority, String(slot.slotOrder))}
                          color={pref.isAutoAssigned ? theme.autoAssigned : headerColor}
                        />
                      ) : (
                        <div style={{ color: theme.textLight, fontSize: '0.9em', textAlign: 'center' }}>Drop</div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, color: theme.text }}>Available Preferences</h4>
          {poolList.length > 0 && (
            <button
              onClick={onAutoComplete}
              style={{ ...buttonStyles.base, ...buttonStyles.primary, padding: '4px 12px', fontSize: '0.85em' }}
            >
              Auto Complete
            </button>
          )}
        </div>
        <div
          style={{
            border: `2px dashed ${theme.border}`,
            borderRadius: 6,
            padding: 12,
            minHeight: 60,
            backgroundColor: theme.background,
          }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 42 }}>
            {poolList.map((item) => (
              <DraggablePriority
                key={item.id}
                priority={item.priority}
                onDragStart={(e) => handleDragStart(e, item.priority, null)}
                color={headerColor}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;