import React, { useMemo } from 'react';
import { ReactSortable } from 'react-sortablejs';
import {
  theme,
  getOrderedList,
  reorderGroupOnClear,
  reorderGroupOnSet,
} from './calendarUtils';

const RankedList = ({ preferences, setPrefs, onDragEnd, groupKey }) => {
  const orderedList = useMemo(() => getOrderedList(preferences), [preferences]);

  const moveItemKeyboard = (slotOrder, delta) => {
    const curPri = preferences[slotOrder].priority ? parseInt(preferences[slotOrder].priority) : null;
    if (!curPri) return;
    const targetPri = curPri + delta;
    if (targetPri < 1) return;
    let newPrefs = { ...preferences };
    newPrefs = reorderGroupOnClear(newPrefs, slotOrder, curPri);
    newPrefs = reorderGroupOnSet(newPrefs, slotOrder, targetPri);
    setPrefs(newPrefs);
  };

  return (
    <div style={{ width: 320, flexShrink: 0 }}>
      <h4 style={{ marginTop: 0, color: theme.text }}>Ranked Preferences</h4>
      <div
        style={{
          border: `2px solid ${theme.primary}`,
          borderRadius: 6,
          padding: 12,
          minHeight: 200,
          maxHeight: 500,
          overflowY: 'auto',
          backgroundColor: theme.background,
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        }}
      >
        {orderedList.length === 0 ? (
          <p
            style={{
              color: theme.textLight,
              textAlign: 'center',
              margin: 0,
              padding: '40px 10px',
              fontSize: '0.95em',
            }}
          >
            Click a slot to add it to your list
          </p>
        ) : (
          <ReactSortable
            tag="ol"
            style={{ margin: 0, paddingLeft: 12, listStyle: 'none' }}
            list={orderedList}
            setList={() => {}}
            group={groupKey}
            onEnd={onDragEnd}
            data-type="ranked-list"
            data-group-key={groupKey}
            animation={150}
          >
            {orderedList.map((item) => (
              <li
                key={item.order}
                data-priority={item.pri}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    moveItemKeyboard(item.order, -1);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    moveItemKeyboard(item.order, 1);
                  }
                }}
                style={{
                  padding: '10px 8px',
                  margin: '6px 0',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 4,
                  cursor: 'move',
                  userSelect: 'none',
                  fontSize: '0.95em',
                  color: theme.text,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontWeight: 600 }} data-priority={item.pri}>{item.pri}.</span> {item.label}
              </li>
            ))}
          </ReactSortable>
        )}
      </div>
    </div>
  );
};

export default RankedList;