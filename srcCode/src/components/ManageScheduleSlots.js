import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { theme, buttonStyles } from './calendarUtils';

const ManageScheduleSlots = () => {
  const [slots, setSlots] = useState([]);
  const [weekdayLocalTimes, setWeekdayLocalTimes] = useState([]);
  const [weekendLocalTimes, setWeekendLocalTimes] = useState([]);
  const [weekdayAddTime, setWeekdayAddTime] = useState('15:30');
  const [weekendAddTime, setWeekendAddTime] = useState('07:00');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    fetchSlots();
    fetchLockStatus();
  }, []);

  const fetchLockStatus = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'slots_locked')
      .maybeSingle();
    if (data) {
      setIsLocked(data.value === 'true');
    }
  };

  const toggleLock = async () => {
    if (isLocked) {
      if (window.confirm("⚠️ WARNING: Unlocking the slots will PERMANENTLY DELETE all currently submitted preferences from all coaches.\n\nThis action cannot be undone. Are you sure you want to unlock and reset?")) {
        // 1. Delete all preferences
        const { error: deleteError } = await supabase.from('preferences').delete().neq('id', 0);
        if (deleteError) {
          console.error('Error deleting preferences:', deleteError);
          alert('Failed to delete preferences. Unlock aborted.');
          return;
        }

        // 2. Reset coach flags
        await supabase.from('coaches').update({ weekdayPreferencesSaved: false, weekendPreferenceSaved: false }).neq('id', 0);

        // 3. Unlock
        const { error } = await supabase.from('app_settings').upsert({ key: 'slots_locked', value: 'false' });
        if (error) {
          console.error('Error updating lock status:', error);
          alert('Failed to update lock status.');
        } else {
          setIsLocked(false);
        }
      }
    } else {
      if (window.confirm("Locking the slots will finalize the schedule and allow coaches to submit their preferences.\n\nYou will not be able to add, remove, or rename slots while they are locked.\n\nContinue?")) {
        const { error } = await supabase.from('app_settings').upsert({ key: 'slots_locked', value: 'true' });
        if (error) {
          console.error('Error updating lock status:', error);
          alert('Failed to update lock status.');
        } else {
          setIsLocked(true);
        }
      }
    }
  };

  const fetchSlots = async () => {
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .order('slotDay', { ascending: true })
      .order('slotStartTime', { ascending: true });
    if (error) console.error('Error fetching slots:', error);
    else setSlots(data);
  };

  const handleTimeChange = (part, value, currentTime, setTime) => {
    const [h, m] = currentTime.split(':');
    if (part === 'hour') {
      setTime(`${value}:${m}`);
    } else {
      setTime(`${h}:${value}`);
    }
  };

  const handleAddRow = (timeToAdd, setLocalTimes) => {
    setLocalTimes((prev) => {
      if (!prev.includes(timeToAdd)) {
        return [...prev, timeToAdd].sort();
      }
      return prev;
    });
  };

  const handleDeleteRow = (timeToDelete, setLocalTimes) => {
    setLocalTimes((prev) => prev.filter((t) => t !== timeToDelete));
  };

  const updateSlotName = async (id, newName) => {
    if (isLocked) return;
    setSlots(prev => prev.map(s => s.id === id ? { ...s, slotName: newName } : s));
    const { error } = await supabase.from('slots').update({ slotName: newName }).eq('id', id);
    if (error) {
      console.error('Error updating slot name:', error);
    }
  };

  const handleDelete = async (id) => {
    if (isLocked) return;
    if (window.confirm('Are you sure you want to delete this slot?')) {
      const { error } = await supabase.from('slots').delete().eq('id', id);
      if (error) console.error('Error deleting slot:', error);
      else fetchSlots();
    }
  };

  const handleAdd = async (day, startTime) => {
    if (isLocked) return;
    let endTime = '';
    let formattedStartTime = startTime;

    if (startTime) {
      if (startTime.length > 5) {
        formattedStartTime = startTime.slice(0, 5);
      }
      const [h, m] = formattedStartTime.split(':').map(Number);
      const endH = (h + 1) % 24;
      const hh = String(endH).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      endTime = `${hh}:${mm}`;
    }

    const slotData = {
      slotDay: day,
      slotStartTime: formattedStartTime,
      slotEndTime: endTime
    };

    const { error } = await supabase.from('slots').insert([slotData]);
    if (error) {
      console.error('Error adding slot:', error);
    } else {
      fetchSlots();
    }
  };

  const weekdayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weekendDays = ['Sat', 'Sun'];

  const minutes = ['00', '15', '30', '45'];

  const renderAddRowForm = (currentTime, setTime, setLocalTimes, minHour, maxHour, restrictedStartMin = 0) => {
    const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => String(i + minHour).padStart(2, '0'));
    const [currentH, currentM] = currentTime.split(':');

    // Filter minutes if on the minimum hour
    const availableMinutes = (parseInt(currentH) === minHour) 
      ? minutes.filter(m => parseInt(m) >= restrictedStartMin)
      : minutes;

    return (
      <div style={{ marginBottom: 20, display: 'flex', gap: '10px', maxWidth: '600px', alignItems: 'flex-end', backgroundColor: theme.light, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.border}`, opacity: isLocked ? 0.6 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
        <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Hour</label>
            <select
              value={currentH}
              onChange={(e) => handleTimeChange('hour', e.target.value, currentTime, setTime)}
              style={{ width: '100%', padding: '8px' }}
            >
              {hours.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Minute</label>
            <select
              value={currentM}
              onChange={(e) => handleTimeChange('minute', e.target.value, currentTime, setTime)}
              style={{ width: '100%', padding: '8px' }}
            >
              {availableMinutes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <button 
          onClick={() => handleAddRow(currentTime, setLocalTimes)}
          style={{ ...buttonStyles.base, ...buttonStyles.success, height: '38px' }}
          disabled={isLocked}
        >
          Add Row
        </button>
      </div>
    );
  };

  const renderGrid = (title, days, localTimes, setLocalTimes, addTime, setAddTime, constraints) => {
    const relevantSlots = slots.filter((s) => days.includes(s.slotDay));
    const dbStartTimes = relevantSlots.map((s) => s.slotStartTime.slice(0, 5));
    const uniqueStartTimes = [...new Set([...dbStartTimes, ...localTimes])].sort();

    return (
      <div style={{ marginBottom: '40px', backgroundColor: theme.background, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: theme.primary }}>{title}</h3>
        {renderAddRowForm(addTime, setAddTime, setLocalTimes, constraints.minHour, constraints.maxHour, constraints.restrictedStartMin)}
        {uniqueStartTimes.length === 0 ? (
          <p style={{ color: theme.textLight, fontStyle: 'italic' }}>No slots configured for this group.</p>
        ) : (
          <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', borderColor: '#dee2e6' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: '#f8f9fa', padding: '10px', width: '100px' }}>Time</th>
                {days.map((day) => (
                  <th key={day} style={{ backgroundColor: '#f8f9fa', padding: '10px' }}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueStartTimes.map((time) => {
                const representativeSlot = relevantSlots.find(s => s.slotStartTime.slice(0, 5) === time);
                let endTime = representativeSlot ? representativeSlot.slotEndTime : '';
                
                if (!endTime) {
                   const [h, m] = time.split(':').map(Number);
                   const endH = (h + 1) % 24;
                   endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                }
                
                const rowHasSlots = relevantSlots.some(s => s.slotStartTime.slice(0, 5) === time);

                return (
                <tr key={time}>
                  <td style={{ fontWeight: 'bold', padding: '10px', backgroundColor: '#fff', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {!rowHasSlots && (
                        <button 
                          onClick={() => handleDeleteRow(time, setLocalTimes)}
                          style={{ ...buttonStyles.base, ...buttonStyles.outlineDanger, padding: '4px', marginRight: '10px', border: 'none', display: 'flex' }}
                          title="Remove empty row"
                          disabled={isLocked}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                          </svg>
                        </button>
                      )}
                      <span>{time.slice(0, 5)} - {endTime.slice(0, 5)}</span>
                    </div>
                  </td>
                  {days.map((day) => {
                    const cellSlots = relevantSlots.filter((s) => s.slotDay === day && s.slotStartTime.slice(0, 5) === time);
                    return (
                      <td
                        key={day}
                        style={{
                          backgroundColor: cellSlots.length > 0 ? '#ffffff' : '#e9ecef',
                          padding: '10px',
                          verticalAlign: 'top',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {cellSlots.map(slot => (
                            <div
                              key={slot.id}
                              style={{
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                padding: '8px',
                                backgroundColor: '#fff',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                fontSize: '0.9em',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <input 
                                type="text" 
                                defaultValue={slot.slotName || 'Practice Slot'} 
                                onBlur={(e) => updateSlotName(slot.id, e.target.value)}
                                style={{ border: 'none', fontWeight: '500', flex: 1, textAlign: 'center', width: '100%', background: 'transparent' }}
                                disabled={isLocked}
                              />
                              <button
                                onClick={() => handleDelete(slot.id)}
                                style={{ ...buttonStyles.base, ...buttonStyles.outlineDanger, padding: '0', border: 'none', background: 'transparent', display: 'flex' }}
                                title="Delete Slot"
                                disabled={isLocked}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg>
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => handleAdd(day, time)}
                            style={{ ...buttonStyles.base, padding: '4px', backgroundColor: 'transparent', border: `1px dashed ${theme.border}`, color: theme.primary, width: '100%', justifyContent: 'center', display: 'flex' }}
                            title="Add Slot"
                            disabled={isLocked}
                          >
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                              <path fillRule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
                );
                })}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: theme.text, margin: 0 }}>Manage Schedule Slots</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ padding: '8px 12px', borderRadius: '4px', backgroundColor: isLocked ? '#fff3cd' : '#d4edda', color: isLocked ? '#856404' : '#155724', border: `1px solid ${isLocked ? '#ffeeba' : '#c3e6cb'}` }}>
                {isLocked ? '🔒 Slots Locked (Ready for Preferences)' : '🔓 Slots Unlocked (Editing Allowed)'}
            </div>
            <button 
                onClick={toggleLock}
                style={{ ...buttonStyles.base, backgroundColor: isLocked ? theme.secondary : theme.danger, color: 'white' }}
            >
                {isLocked ? 'Unlock Slots' : 'Lock Slots'}
            </button>
        </div>
      </div>
      
      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: theme.light, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
          {!isLocked && <p style={{ margin: 0, color: theme.text }}><strong>Status: Editing Mode.</strong> Use the controls below to add or remove slots. <strong>Lock the slots</strong> when you are done to allow coaches to submit preferences.</p>}
          {isLocked && <p style={{ margin: 0, color: theme.danger }}><strong>Status: Locked.</strong> Slots are currently locked. You cannot add, edit, or delete slots. Unlock to make changes (this will disable preference submission for coaches).</p>}
      </div>

      {renderGrid(
        'Weekdays (Mon-Fri)', 
        weekdayDays, 
        weekdayLocalTimes, 
        setWeekdayLocalTimes, 
        weekdayAddTime, 
        setWeekdayAddTime,
        { minHour: 15, maxHour: 22, restrictedStartMin: 30 }
      )}
      
      {renderGrid(
        'Weekends (Sat-Sun)', 
        weekendDays, 
        weekendLocalTimes, 
        setWeekendLocalTimes, 
        weekendAddTime, 
        setWeekendAddTime,
        { minHour: 7, maxHour: 18 }
      )}
    </div>
  );
};

export default ManageScheduleSlots;