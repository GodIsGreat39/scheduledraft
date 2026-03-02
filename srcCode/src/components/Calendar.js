import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import ScheduleGrid from './ScheduleGrid';
import {
  theme,
} from './calendarUtils';

// A weekly calendar showing dynamic time slots grouped by weekday/weekend.
// Coaches assign a priority number (1 = most preferred, max = unavailable).
// Each group (weekday/weekend) is independent.

const GridWithOrderList = ({
  title,
  slotsByDay,
  days,
  uniqueTimes,
  preferences,
  totalSlots,
  groupKey,
  onMove,
  onAutoComplete,
  headerColor,
}) => {
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
      </div>
      <div style={{ display: 'flex', gap: 30 }}>
        <ScheduleGrid
          slotsByDay={slotsByDay}
          days={days}
          uniqueTimes={uniqueTimes}
          preferences={preferences}
          totalSlots={totalSlots}
          groupKey={groupKey}
          onDrop={onMove}
          onAutoComplete={onAutoComplete}
          headerColor={headerColor}
        />
      </div>
    </div>
  );
};

const Calendar = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [isSlotsLocked, setIsSlotsLocked] = useState(false);
  const [coachesList, setCoachesList] = useState([]);
  const [selectedCoachId, setSelectedCoachId] = useState(user ? user.id : null);
  const [saving, setSaving] = useState(false);
  const [calendarData, setCalendarData] = useState({
    weekdaySlots: [],
    weekendSlots: [],
    totalWeekdaySlots: 0,
    totalWeekendSlots: 0,
    slotsByDayWeekday: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] },
    slotsByDayWeekend: { Sat: [], Sun: [] },
    uniqueTimesWeekday: [],
    uniqueTimesWeekend: [],
    weekdayDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    weekendDays: ['Sat', 'Sun']
  });
  const [initialState, setInitialState] = useState({
    weekday: {},
    weekend: {}
  });

  // authoritative datastore for both groups
  const [slotPreferences, setSlotPreferences] = useState({
    weekday: {},
    weekend: {},
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchSlots = async () => {
      const { data: dbSlots, error } = await supabase
        .from('slots')
        .select('*');

      if (error) {
        console.error('Error fetching slots:', error);
        setLoading(false);
        return;
      }

      const dayOrder = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
      
      // Sort slots by day then time
      const sortedSlots = dbSlots.sort((a, b) => {
        const dA = dayOrder[a.slotDay] || 99;
        const dB = dayOrder[b.slotDay] || 99;
        if (dA !== dB) return dA - dB;
        return a.slotStartTime.localeCompare(b.slotStartTime);
      });

      let weekdayOrder = 1;
      let weekendOrder = 1;

      const processedSlots = sortedSlots.map(slot => {
        const isWeekend = ['Sat', 'Sun'].includes(slot.slotDay);
        const group = isWeekend ? 'weekend' : 'weekday';
        const order = isWeekend ? weekendOrder++ : weekdayOrder++;
        const timeStr = `${slot.slotStartTime.slice(0, 5)} - ${slot.slotEndTime.slice(0, 5)}`;
        
        return {
          ...slot,
          slotGroup: group,
          slotOrder: order,
          slotTime: timeStr,
          slotLabel: `${slot.slotDay} ${timeStr}`
        };
      });

      const weekdaySlots = processedSlots.filter(s => s.slotGroup === 'weekday');
      const weekendSlots = processedSlots.filter(s => s.slotGroup === 'weekend');

      const slotsByDayWeekday = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
      weekdaySlots.forEach(slot => slotsByDayWeekday[slot.slotDay].push(slot));

      const slotsByDayWeekend = { Sat: [], Sun: [] };
      weekendSlots.forEach(slot => slotsByDayWeekend[slot.slotDay].push(slot));

      const uniqueTimesWeekday = Array.from(new Set(weekdaySlots.map(s => s.slotTime))).sort();
      const uniqueTimesWeekend = Array.from(new Set(weekendSlots.map(s => s.slotTime))).sort();

      const initialWeekday = weekdaySlots.reduce((acc, slot) => {
        acc[slot.slotOrder] = { priority: '', slotLabel: slot.slotLabel };
        return acc;
      }, {});

      const initialWeekend = weekendSlots.reduce((acc, slot) => {
        acc[slot.slotOrder] = { priority: '', slotLabel: slot.slotLabel };
        return acc;
      }, {});

      const { data: lockData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'slots_locked')
        .maybeSingle();
      setIsSlotsLocked(lockData?.value === 'true');

      setCalendarData({
        weekdaySlots,
        weekendSlots,
        totalWeekdaySlots: weekdaySlots.length,
        totalWeekendSlots: weekendSlots.length,
        slotsByDayWeekday,
        slotsByDayWeekend,
        uniqueTimesWeekday,
        uniqueTimesWeekend,
        weekdayDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        weekendDays: ['Sat', 'Sun']
      });

      setInitialState({
        weekday: initialWeekday,
        weekend: initialWeekend
      });

      setSlotPreferences({
        weekday: initialWeekday,
        weekend: initialWeekend
      });

      setLoading(false);
    };

    fetchSlots();
  }, []);

  useEffect(() => {
    if (user && user.role === 'siteAdmin') {
      const fetchCoaches = async () => {
        const { data, error } = await supabase
          .from('coaches')
          .select('id, name, isCoach')
          .eq('isCoach', true)
          .order('name');
        if (!error && data) {
          setCoachesList(data);
        }
      };
      fetchCoaches();
    }
  }, [user]);

  useEffect(() => {
    if (!calendarData.totalWeekdaySlots || !selectedCoachId) return;

    const fetchPreferences = async () => {
      const { data } = await supabase
        .from('preferences')
        .select('preferences')
        .eq('coachId', selectedCoachId)
        .eq('isActive', true)
        .maybeSingle();

      if (data) {
        const prefs = data.preferences || {};
        // Merge with initialState to ensure all current slots are present
        const merged = {
          weekday: { ...initialState.weekday, ...(prefs.weekday || {}) },
          weekend: { ...initialState.weekend, ...(prefs.weekend || {}) }
        };
        setSlotPreferences(merged);
      } else {
        setSlotPreferences({ ...initialState });
      }
    };

    fetchPreferences();
  }, [selectedCoachId, calendarData.totalWeekdaySlots, initialState]);

  const handleAutoComplete = (groupKey) => {
    setSlotPreferences((prev) => {
      const newPrefs = { ...prev };
      const groupPrefs = { ...newPrefs[groupKey] };
      const totalSlots = groupKey === 'weekday' ? calendarData.totalWeekdaySlots : calendarData.totalWeekendSlots;

      // Identify used priorities
      const usedPriorities = new Set();
      Object.values(groupPrefs).forEach(p => {
        if (p.priority) usedPriorities.add(parseInt(p.priority));
      });

      // Identify available priorities
      const pool = [];
      for (let i = 1; i <= totalSlots; i++) {
        if (!usedPriorities.has(i)) {
          pool.push(i);
        }
      }
      pool.sort((a, b) => a - b);

      if (pool.length === 0) return prev;

      // Identify empty slots (sorted by slotOrder)
      const slotOrders = Object.keys(groupPrefs).sort((a, b) => parseInt(a) - parseInt(b));
      
      let poolIndex = 0;
      slotOrders.forEach(order => {
        if (!groupPrefs[order].priority && poolIndex < pool.length) {
          groupPrefs[order] = {
            ...groupPrefs[order],
            priority: pool[poolIndex].toString(),
            isAutoAssigned: true
          };
          poolIndex++;
        }
      });

      newPrefs[groupKey] = groupPrefs;
      return newPrefs;
    });
    setToast('Auto-completed remaining slots');
    setTimeout(() => setToast(null), 3000);
  };

  const handleMove = (groupKey, fromSlot, toSlot, priority) => {
    if (fromSlot === toSlot) return;

    setSlotPreferences((prev) => {
      const newPrefs = { ...prev };
      const groupPrefs = { ...newPrefs[groupKey] };

      // Get target priority (if swapping)
      const targetPriority = toSlot ? groupPrefs[toSlot].priority : null;

      // Update target slot
      if (toSlot) {
        groupPrefs[toSlot] = { ...groupPrefs[toSlot], priority: priority, isAutoAssigned: false };
      }

      // Update source slot (if moved from another slot)
      if (fromSlot) {
        groupPrefs[fromSlot] = { ...groupPrefs[fromSlot], priority: targetPriority || '', isAutoAssigned: false };
      }

      newPrefs[groupKey] = groupPrefs;
      return newPrefs;
    });
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // 1. Mark prior preferences as obsolete
      await supabase
        .from('preferences')
        .update({ isActive: false })
        .eq('coachId', selectedCoachId);

      // 2. Insert new preferences
      const { error } = await supabase
        .from('preferences')
        .insert([
          {
            coachId: selectedCoachId,
            preferences: slotPreferences,
            isActive: true,
          },
        ]);

      if (error) throw error;

      // 3. Update coach flags
      const hasWeekday = Object.values(slotPreferences.weekday).some((p) => p.priority);
      const hasWeekend = Object.values(slotPreferences.weekend).some((p) => p.priority);

      await supabase
        .from('coaches')
        .update({
          weekdayPreferencesSaved: hasWeekday,
          weekendPreferenceSaved: hasWeekend,
        })
        .eq('id', selectedCoachId);

      setToast('Preferences saved successfully');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear all your choices? This cannot be undone.')) {
      setSlotPreferences({
        weekday: initialState.weekday,
        weekend: initialState.weekend,
      });
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: theme.text, fontSize: '1.2em' }}>Loading schedule...</div>;
  }

  const getSaveButtonLabel = () => {
    if (saving) return 'Saving...';
    if (user.role === 'siteAdmin' && selectedCoachId !== user.id) {
      const coachName = coachesList.find(c => c.id === parseInt(selectedCoachId))?.name || 'Coach';
      return `Save Preferences for ${coachName}`;
    }
    return 'Save All Preferences';
  };

  const {
    totalWeekdaySlots,
    totalWeekendSlots,
    slotsByDayWeekday,
    slotsByDayWeekend,
    uniqueTimesWeekday,
    uniqueTimesWeekend,
    weekdayDays,
    weekendDays
  } = calendarData;

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
        {user && user.role === 'siteAdmin' && (
          <div style={{ marginBottom: 20, padding: 15, backgroundColor: theme.light, borderRadius: 8, border: `1px solid ${theme.border}` }}>
            <label style={{ fontWeight: 'bold', marginRight: 10 }}>Proxy as Coach:</label>
            <select
              value={selectedCoachId}
              onChange={(e) => setSelectedCoachId(e.target.value)}
              style={{ padding: 5, borderRadius: 4, border: `1px solid ${theme.border}` }}
            >
              {coachesList.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.name} {coach.id === user.id ? '(You)' : ''}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 5, fontSize: '0.9em', color: theme.textLight }}>
              You are viewing and editing preferences for the selected coach.
            </div>
          </div>
        )}

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
        
        {!isSlotsLocked && (
            <div style={{ padding: '15px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '8px', marginBottom: '20px' }}>
                <strong>⚠️ Schedule Not Finalized</strong><br/>
                Administrators are currently updating the schedule slots. You cannot submit preferences until the schedule is locked.
            </div>
        )}
        {isSlotsLocked && (
            <div style={{ padding: '15px', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '8px', marginBottom: '20px' }}>
                <strong>✅ Schedule Finalized</strong><br/>
                The schedule slots are locked and ready for your preferences. Please submit your choices below.
            </div>
        )}

        <p style={{ color: theme.textLight, marginTop: 0 }}>
          Select and rank your preferred practice session times. Click a slot to add it, or drag items in the ranked list to reorder.
        </p>

        <GridWithOrderList
          title="Weekday Slots (Mon-Fri)"
          slotsByDay={slotsByDayWeekday}
          days={weekdayDays}
          uniqueTimes={uniqueTimesWeekday}
          preferences={slotPreferences.weekday}
          totalSlots={totalWeekdaySlots}
          groupKey="weekday"
          onMove={(from, to, pri) => handleMove('weekday', from, to, pri)}
          onAutoComplete={() => handleAutoComplete('weekday')}
          headerColor={theme.primary}
        />

        <GridWithOrderList
          title="Weekend Slots (Sat-Sun)"
          slotsByDay={slotsByDayWeekend}
          days={weekendDays}
          uniqueTimes={uniqueTimesWeekend}
          preferences={slotPreferences.weekend}
          totalSlots={totalWeekendSlots}
          groupKey="weekend"
          onMove={(from, to, pri) => handleMove('weekend', from, to, pri)}
          onAutoComplete={() => handleAutoComplete('weekend')}
          headerColor={theme.weekend}
        />

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          {user && (user.role === 'coach' || user.role === 'siteAdmin') ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '12px 40px',
                  fontSize: '1.05em',
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: theme.danger,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#c82333')}
                onMouseOut={(e) => (e.target.style.backgroundColor = theme.danger)}
              >
                Reset Choices
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !isSlotsLocked}
                style={{
                  padding: '12px 40px',
                  fontSize: '1.05em',
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: (saving || !isSlotsLocked) ? theme.secondary : theme.success,
                  border: 'none',
                  borderRadius: 6,
                  cursor: (saving || !isSlotsLocked) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
                onMouseOver={(e) => (!saving && isSlotsLocked) && (e.target.style.backgroundColor = '#218838')}
                onMouseOut={(e) => (!saving && isSlotsLocked) && (e.target.style.backgroundColor = theme.success)}
              >
                {getSaveButtonLabel()}
              </button>
            </div>
          ) : (
            <p style={{ color: theme.textLight, fontStyle: 'italic' }}>Read-only view (Admin)</p>
          )}
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
