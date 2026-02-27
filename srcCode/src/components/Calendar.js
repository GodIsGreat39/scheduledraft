import React, { useState, useMemo } from 'react';
import { ReactSortable } from 'react-sortablejs';
import { timeslots } from '../timeslots';

// A weekly calendar showing dynamic time slots grouped by weekday/weekend.
// Coaches assign a priority number (1 = most preferred, max = unavailable).
// Each group (weekday/weekend) is independent.
// Grid + ordered list on the right provide dual interaction methods.

// Theme colors
const theme = {
  primary: '#0066cc',
  primaryHover: '#0052a3',
  secondary: '#6c757d',
  success: '#28a745',
  danger: '#dc3545',
  light: '#f8f9fa',
  border: '#dee2e6',
  text: '#212529',
  textLight: '#6c757d',
  background: '#ffffff',
};

const Calendar = () => {
  const weekdaySlots = timeslots.filter((s) => s.slotGroup === 'weekday');
  const weekendSlots = timeslots.filter((s) => s.slotGroup === 'weekend');

  const totalWeekdaySlots = weekdaySlots.length;
  const totalWeekendSlots = weekendSlots.length;

  // Group slots by day for each group
  const slotsByDayWeekday = useMemo(() => {
    const map = {
      Mon: [],
      Tue: [],
      Wed: [],
      Thu: [],
      Fri: [],
    };
    weekdaySlots.forEach((slot) => {
      map[slot.slotDay].push(slot);
    });
    return map;
  }, []);

  const slotsByDayWeekend = useMemo(() => {
    const map = {
      Sat: [],
      Sun: [],
    };
    weekendSlots.forEach((slot) => {
      map[slot.slotDay].push(slot);
    });
    return map;
  }, []);

  const weekdayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weekendDays = ['Sat', 'Sun'];

  const uniqueTimesWeekday = useMemo(() => {
    const times = new Set();
    weekdaySlots.forEach((slot) => times.add(slot.slotTime));
    return Array.from(times).sort();
  }, []);

  const uniqueTimesWeekend = useMemo(() => {
    const times = new Set();
    weekendSlots.forEach((slot) => times.add(slot.slotTime));
    return Array.from(times).sort();
  }, []);

  // Initialize preferences for each group
  const initialWeekday = weekdaySlots.reduce((acc, slot) => {
    acc[slot.slotOrder] = { priority: '', slotLabel: slot.slotLabel };
    return acc;
  }, {});

  const initialWeekend = weekendSlots.reduce((acc, slot) => {
    acc[slot.slotOrder] = { priority: '', slotLabel: slot.slotLabel };
    return acc;
  }, {});

  // authoritative datastore for both groups
  const [slotPreferences, setSlotPreferences] = useState({
    weekday: initialWeekday,
    weekend: initialWeekend,
  });
  const [editingInputs, setEditingInputs] = useState({});
  // dropTarget no longer needed; SortableJS will handle drag-drop
  // const [dropTarget, setDropTarget] = useState({ group: null, index: null });
  const [toast, setToast] = useState(null);
  // removed global ref; we will create per-grid refs inside helper

  // Consolidate preferences within a group
  const compactPrefsForGroup = (prefs) => {
    const list = [];
    Object.entries(prefs).forEach(([order, data]) => {
      const pri = data.priority ? parseInt(data.priority) : null;
      if (pri) {
        list.push({ order: parseInt(order), pri });
      }
    });
    list.sort((a, b) => a.pri - b.pri);
    const newPrefs = { ...prefs };
    list.forEach(({ order }, i) => {
      newPrefs[order].priority = (i + 1).toString();
    });
    return newPrefs;
  };

  // Get next available priority
  const getNextPriority = (prefs) => {
    const list = [];
    Object.entries(prefs).forEach(([order, data]) => {
      const pri = data.priority ? parseInt(data.priority) : null;
      if (pri) {
        list.push(pri);
      }
    });
    if (list.length === 0) return 1;
    return Math.max(...list) + 1;
  };

  // Reorder when a new priority is set (per group)
  const reorderGroupOnSet = (prefs, changedOrder, newPriority) => {
    let flat = [];
    Object.entries(prefs).forEach(([order, data]) => {
      const pri = data.priority ? parseInt(data.priority) : null;
      if (pri) {
        flat.push({ order: parseInt(order), pri });
      }
    });
    flat = flat.filter((e) => e.order !== changedOrder);
    const hasConflict = flat.some((e) => e.pri === newPriority);
    if (hasConflict) {
      flat.forEach((e) => {
        if (e.pri >= newPriority) {
          e.pri += 1;
        }
      });
    }
    flat.push({ order: changedOrder, pri: newPriority });
    flat.sort((a, b) => a.pri - b.pri);
    const newPrefs = { ...prefs };
    flat.forEach(({ order, pri }) => {
      newPrefs[order].priority = pri.toString();
    });
    return newPrefs;
  };

  // Clear priority and collapse gaps (per group)
  const reorderGroupOnClear = (prefs, changedOrder, oldPriority) => {
    const newPrefs = { ...prefs };
    Object.entries(newPrefs).forEach(([order, data]) => {
      const pri = data.priority ? parseInt(data.priority) : null;
      if (pri && pri > oldPriority) {
        newPrefs[order].priority = (pri - 1).toString();
      }
    });
    newPrefs[changedOrder].priority = '';
    return compactPrefsForGroup(newPrefs);
  };

  // legacy drag handlers removed; SortableJS will drive ordering now

  // Drop handler based on mouse event position relative to list container
  // when Sortable informs us of order change, update preferences
  const handleOrderChange = (prefs, setPrefs, oldIndex, newIndex) => {
    if (oldIndex === newIndex) return;
    const list = [];
    Object.entries(prefs).forEach(([order, data]) => {
      const pri = data.priority ? parseInt(data.priority) : null;
      if (pri) list.push({ order: parseInt(order), pri });
    });
    list.sort((a, b) => a.pri - b.pri);
    const moved = list.splice(oldIndex, 1)[0];
    list.splice(newIndex, 0, moved);
    const newPrefs = { ...prefs };
    list.forEach((item, i) => {
      newPrefs[item.order].priority = (i + 1).toString();
    });
    setPrefs(newPrefs);
  };

  // generic focus handler taking group string
  const handleFocus = (group, slotOrder) => {
    // fill priority if blank
    setSlotPreferences((prev) => {
      const prefs = prev[group];
      if (!prefs[slotOrder].priority) {
        const nextPri = getNextPriority(prefs);
        return { ...prev, [group]: reorderGroupOnSet(prefs, slotOrder, nextPri) };
      }
      return prev;
    });
    setEditingInputs((prev) => ({
      ...prev,
      [slotOrder]: slotPreferences[group][slotOrder]?.priority || '',
    }));
  };

  const handleLocalInputChange = (slotOrder, value) => {
    console.log('local change', slotOrder, value);
    setEditingInputs((prev) => ({ ...prev, [slotOrder]: value }));
  };

  const commitLocalInput = (slotOrder, group, handleChange) => {
    const val = editingInputs[slotOrder];
    if (val === undefined) return;
    handleChange(group, slotOrder, val === '' ? '' : val);
    setEditingInputs((prev) => {
      const copy = { ...prev };
      delete copy[slotOrder];
      return copy;
    });
  };

  const handleChange = (group, slotOrder, newValue) => {
    setSlotPreferences((prev) => {
      const prefs = prev[group];
      const num = parseInt(newValue);
      if (!isNaN(num) && newValue !== '') {
        return { ...prev, [group]: reorderGroupOnSet(prefs, slotOrder, num) };
      } else if (newValue === '') {
        const oldPri = prefs[slotOrder].priority
          ? parseInt(prefs[slotOrder].priority)
          : null;
        if (oldPri) {
          return { ...prev, [group]: reorderGroupOnClear(prefs, slotOrder, oldPri) };
        }
      }
      return prev;
    });
  };

  const handleSubmit = () => {
    console.log('submitted', slotPreferences);
    alert('Preferences saved (console output)');
  };

  // Get ordered list for a group
  const getOrderedList = (prefs, slots) => {
    const list = [];
    Object.entries(prefs).forEach(([order, data]) => {
      const pri = data.priority ? parseInt(data.priority) : null;
      if (pri) {
        list.push({ order: parseInt(order), pri, label: data.slotLabel });
      }
    });
    list.sort((a, b) => a.pri - b.pri);
    return list;
  };

  // Detect whether a group's priorities contain gaps (non-consecutive starting at 1)
  const hasGaps = (prefs) => {
    const pris = Object.values(prefs)
      .map((d) => (d.priority ? parseInt(d.priority) : null))
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (pris.length === 0) return false;
    for (let i = 0; i < pris.length; i++) {
      if (pris[i] !== i + 1) return true;
    }
    return false;
  };

  // Grid rendering helper
  // Component used to render a grid and its ordered list; separated to obey hooks rules
  const GridWithOrderList = ({
    title,
    slotsByDay,
    days,
    uniqueTimes,
    preferences,
    handleChange,
    handleFocus,
    totalSlots,
    setPrefs,
    groupKey,
  }) => {
    const orderedList = useMemo(() => getOrderedList(preferences, []), [preferences]);
    // controlled list mode: ReactSortable will call setList when drag order changes
    const reorderFromSortable = (newList) => {
      // newList is array of {order, pri, label}
      const newPrefs = { ...preferences };
      newList.forEach((item, i) => {
        newPrefs[item.order].priority = (i + 1).toString();
      });
      setPrefs(newPrefs);
    };

    // Keyboard move helper: move an item up/down by delta (±1)
    const moveItemKeyboard = (slotOrder, delta) => {
      const curPri = preferences[slotOrder].priority ? parseInt(preferences[slotOrder].priority) : null;
      if (!curPri) return; // nothing to move
      const targetPri = curPri + delta;
      if (targetPri < 1) return;
      // compute new prefs and set
      let newPrefs = { ...preferences };
      newPrefs = reorderGroupOnClear(newPrefs, slotOrder, curPri);
      newPrefs = reorderGroupOnSet(newPrefs, slotOrder, targetPri);
      setPrefs(newPrefs);
    };

    return (
      <div
        style={{
          marginBottom: 40,
          padding: 20,
          backgroundColor: theme.light,
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ color: theme.text, margin: 0 }}>{title}</h3>
          {(() => {
            const showCompact = hasGaps(preferences);
            return (
              <button
                onClick={() => {
                  if (!showCompact) return;
                  setPrefs((prev) => compactPrefsForGroup(prev));
                  setToast('Preferences compacted');
                  setTimeout(() => setToast(null), 2500);
                }}
                disabled={!showCompact}
                title={showCompact ? 'Remove gaps and renumber priorities' : 'No gaps to compact'}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.9em',
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: showCompact ? theme.primary : '#c0c0c0',
                  border: 'none',
                  borderRadius: 6,
                  cursor: showCompact ? 'pointer' : 'not-allowed',
                }}
                onMouseOver={(e) => {
                  if (showCompact) e.target.style.backgroundColor = theme.primaryHover;
                }}
                onMouseOut={(e) => {
                  if (showCompact) e.target.style.backgroundColor = theme.primary;
                }}
              >
                Compact
              </button>
            );
          })()}
        </div>
        <div style={{ display: 'flex', gap: 30 }}>
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
                <tr style={{ backgroundColor: theme.primary }}>
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
                      const pref = preferences[slot.slotOrder];
                      const pri = pref.priority ? parseInt(pref.priority) : null;

                      return (
                        <td
                          key={day}
                          style={{
                            padding: '8px',
                            textAlign: 'center',
                            borderRight: `1px solid ${theme.border}`,
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <input
                              type="number"
                              min="1"
                              max={totalSlots}
                              placeholder="—"
                              value={
                                editingInputs[slot.slotOrder] !== undefined
                                  ? editingInputs[slot.slotOrder]
                                  : pref.priority
                              }
                              onFocus={() => {
                                handleFocus(slot.slotOrder);
                                setEditingInputs((prev) => ({
                                  ...prev,
                                  [slot.slotOrder]:
                                    editingInputs[slot.slotOrder] !== undefined
                                      ? editingInputs[slot.slotOrder]
                                      : pref.priority || '',
                                }));
                              }}
                              onChange={(e) =>
                                handleLocalInputChange(slot.slotOrder, e.target.value)
                              }
                              onBlur={() => commitLocalInput(slot.slotOrder, handleChange)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitLocalInput(slot.slotOrder, handleChange);
                                  e.currentTarget.blur();
                                }
                              }}
                              style={{
                                padding: '6px 8px',
                                fontSize: '0.95em',
                                border: `2px solid ${
                                  pref.priority ? theme.primary : theme.border
                                }`,
                                borderRadius: 4,
                                textAlign: 'center',
                                fontWeight: 600,
                                color: theme.text,
                                transition: 'all 0.2s',
                              }}
                            />
                            {/* No 'unavailable' state: all priorities are valid */}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  setList={reorderFromSortable}
                  onEnd={(evt) => {
                    // update prefs when drag finishes (redundant with setList but safe)
                    handleOrderChange(preferences, setPrefs, evt.oldIndex, evt.newIndex);
                  }}
                  animation={150}
                >
                  {orderedList.map((item, idx) => (
                    <li
                      key={item.order}
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
                      <span style={{ fontWeight: 600 }}>{item.pri}.</span> {item.label}
                    </li>
                  ))}
                </ReactSortable>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 30, backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          backgroundColor: theme.background,
          padding: 30,
          borderRadius: 10,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <h1
          style={{
            color: theme.primary,
            marginTop: 0,
            marginBottom: 10,
            fontSize: '2em',
          }}
        >
          Coach's Schedule Preferences
        </h1>
        <p style={{ color: theme.textLight, marginTop: 0 }}>
          Select and rank your preferred practice session times. Click a slot to add it, or drag items in the ranked list to reorder.
        </p>

        <GridWithOrderList
          title="Weekday Slots (Mon-Fri)"
          slotsByDay={slotsByDayWeekday}
          days={weekdayDays}
          uniqueTimes={uniqueTimesWeekday}
          preferences={slotPreferences.weekday}
          handleChange={handleChange}
          handleFocus={handleFocus}
          totalSlots={totalWeekdaySlots}
          setPrefs={(newPrefs) => setSlotPreferences((prev) => ({ ...prev, weekday: newPrefs }))}
          groupKey="weekday"
        />

        <GridWithOrderList
          title="Weekend Slots (Sat-Sun)"
          slotsByDay={slotsByDayWeekend}
          days={weekendDays}
          uniqueTimes={uniqueTimesWeekend}
          preferences={slotPreferences.weekend}
          handleChange={handleChange}
          handleFocus={handleFocus}
          totalSlots={totalWeekendSlots}
          setPrefs={(newPrefs) => setSlotPreferences((prev) => ({ ...prev, weekend: newPrefs }))}
          groupKey="weekend"
        />

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button
            onClick={handleSubmit}
            style={{
              padding: '12px 40px',
              fontSize: '1.05em',
              fontWeight: 600,
              color: 'white',
              backgroundColor: theme.success,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#218838')}
            onMouseOut={(e) => (e.target.style.backgroundColor = theme.success)}
          >
            Save All Preferences
          </button>
        </div>
      </div>
      {toast && (
        <div
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            background: 'rgba(33,37,41,0.95)',
            color: 'white',
            padding: '10px 14px',
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default Calendar;
