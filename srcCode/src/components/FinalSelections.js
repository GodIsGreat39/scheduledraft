import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { theme, buttonStyles } from './calendarUtils';

const FinalSelections = () => {
  const [assignments, setAssignments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    calculateDraft();
  }, []);

  const calculateDraft = async () => {
    setLoading(true);
    try {
      // 1. Fetch all necessary data
      const [coachesRes, slotsRes, prefsRes] = await Promise.all([
        supabase.from('coaches').select('*').eq('isCoach', true).order('draftPriority', { ascending: true }),
        supabase.from('slots').select('*'),
        supabase.from('preferences').select('*').eq('isActive', true)
      ]);

      if (coachesRes.error) throw coachesRes.error;
      if (slotsRes.error) throw slotsRes.error;
      if (prefsRes.error) throw prefsRes.error;

      const coaches = coachesRes.data;
      const dbSlots = slotsRes.data;
      const allPrefs = prefsRes.data;

      // 2. Process Slots to match Calendar.js logic (assign slotOrder)
      const dayOrder = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
      const sortedSlots = dbSlots.sort((a, b) => {
        const dA = dayOrder[a.slotDay] || 99;
        const dB = dayOrder[b.slotDay] || 99;
        if (dA !== dB) return dA - dB;
        return a.slotStartTime.localeCompare(b.slotStartTime);
      });

      let weekdayOrder = 1;
      let weekendOrder = 1;

      // Map: Group -> Order -> SlotObj
      const slotLookup = { weekday: {}, weekend: {} };

      const processedSlots = sortedSlots.map(slot => {
        const isWeekend = ['Sat', 'Sun'].includes(slot.slotDay);
        const group = isWeekend ? 'weekend' : 'weekday';
        const order = isWeekend ? weekendOrder++ : weekdayOrder++;
        const timeStr = `${slot.slotStartTime.slice(0, 5)} - ${slot.slotEndTime.slice(0, 5)}`;
        
        const processed = { ...slot, slotGroup: group, slotOrder: order, slotTime: timeStr };
        slotLookup[group][order] = processed;
        return processed;
      });
      setSlots(processedSlots);

      // 3. Prepare Coach Preference Queues
      // Map: coachId -> [slotId, slotId, ...] (ordered by priority)
      const coachQueuesWeekday = {};
      const coachQueuesWeekend = {};

      coaches.forEach(coach => {
        const coachPrefRecord = allPrefs.find(p => p.coachId === coach.id);
        
        const getQueue = (groupPrefs, groupName) => {
            const list = [];
            if (groupPrefs) {
                Object.entries(groupPrefs).forEach(([orderKey, data]) => {
                    if (data.priority) {
                        const slot = slotLookup[groupName][orderKey];
                        if (slot) {
                            list.push({
                                priority: parseInt(data.priority),
                                slotId: slot.id
                            });
                        }
                    }
                });
            }
            return list.sort((a, b) => a.priority - b.priority).map(p => p.slotId);
        };

        if (coachPrefRecord && coachPrefRecord.preferences) {
            const { weekday, weekend } = coachPrefRecord.preferences;
            coachQueuesWeekday[coach.id] = getQueue(weekday, 'weekday');
            coachQueuesWeekend[coach.id] = getQueue(weekend, 'weekend');
        } else {
            coachQueuesWeekday[coach.id] = [];
            coachQueuesWeekend[coach.id] = [];
        }
      });

      // 4. Run Draft Logic
      const runDraft = (slotsToDraft, queues) => {
          const results = [];
          const availableSlotIds = new Set(slotsToDraft.map(s => s.id));
          let round = 1;
          
          while (availableSlotIds.size > 0) {
            let slotsAssignedInRound = 0;

            for (const coach of coaches) {
              if (availableSlotIds.size === 0) break;

              const queue = queues[coach.id];
              let assignedSlotId = null;
              let isFallback = false;

              // Find highest priority slot that is still available
              while (queue && queue.length > 0) {
                const candidateId = queue.shift(); // Take top preference
                if (availableSlotIds.has(candidateId)) {
                  assignedSlotId = candidateId;
                  break;
                } else {
                  // Check if another slot at the same time is available
                  const candidateSlot = dbSlots.find(s => s.id === candidateId);
                  if (candidateSlot) {
                    const sameTimeSlots = dbSlots.filter(s => 
                      s.slotDay === candidateSlot.slotDay && 
                      s.slotStartTime === candidateSlot.slotStartTime &&
                      s.slotEndTime === candidateSlot.slotEndTime
                    );
                    const alternative = sameTimeSlots.find(s => availableSlotIds.has(s.id));
                    if (alternative) {
                      assignedSlotId = alternative.id;
                      break;
                    }
                  }
                }
              }

              // If no preferred slot found, assign the next available slot
              if (!assignedSlotId && availableSlotIds.size > 0) {
                assignedSlotId = availableSlotIds.values().next().value;
                isFallback = true;
              }

              if (assignedSlotId) {
                availableSlotIds.delete(assignedSlotId);
                const slot = dbSlots.find(s => s.id === assignedSlotId);
                results.push({
                  round,
                  coachId: coach.id,
                  coachName: coach.name,
                  coachGrade: coach.teamGrade,
                  coachGender: coach.teamGender,
                  coachTeam: coach.teamName,
                  preferenceRank: round, // In this draft logic, round corresponds to the preference rank being satisfied
                  isFallback,
                  slotId: slot.id,
                  slotLabel: `${slot.slotDay} ${slot.slotStartTime.slice(0, 5)} - ${slot.slotEndTime.slice(0, 5)}`
                });
                slotsAssignedInRound++;
              }
            }

            if (slotsAssignedInRound === 0) break; // Stop if no one could take a slot
            round++;
          }
          return results;
      };

      const weekdaySlots = dbSlots.filter(s => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(s.slotDay));
      const weekendSlots = dbSlots.filter(s => ['Sat', 'Sun'].includes(s.slotDay));

      const weekdayAssignments = runDraft(weekdaySlots, coachQueuesWeekday);
      const weekendAssignments = runDraft(weekendSlots, coachQueuesWeekend);

      setAssignments([...weekdayAssignments, ...weekendAssignments]);

    } catch (error) {
      console.error("Error calculating draft:", error);
      alert("Error calculating draft. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!window.confirm('This will overwrite any existing final assignments. Continue?')) return;
    setSaving(true);
    try {
      // Clear existing
      const { error: deleteError } = await supabase.from('finalAssignments').delete().neq('id', 0); // Delete all
      if (deleteError) throw deleteError;

      // Insert new
      const records = assignments.map(a => ({
        coachId: a.coachId,
        slotId: a.slotId
      }));

      if (records.length > 0) {
        const { error: insertError } = await supabase.from('finalAssignments').insert(records);
        if (insertError) throw insertError;
      }

      alert('Final assignments saved successfully!');
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Failed to save assignments.');
    } finally {
      setSaving(false);
    }
  };

  const weekdayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weekendDays = ['Sat', 'Sun'];

  const { slotsByDayWeekday, uniqueTimesWeekday, slotsByDayWeekend, uniqueTimesWeekend } = useMemo(() => {
    const wSlots = slots.filter(s => s.slotGroup === 'weekday');
    const weSlots = slots.filter(s => s.slotGroup === 'weekend');

    const sbDayW = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
    wSlots.forEach(s => sbDayW[s.slotDay]?.push(s));

    const sbDayWe = { Sat: [], Sun: [] };
    weSlots.forEach(s => sbDayWe[s.slotDay]?.push(s));

    const utW = Array.from(new Set(wSlots.map(s => s.slotTime))).sort();
    const utWe = Array.from(new Set(weSlots.map(s => s.slotTime))).sort();

    return {
      slotsByDayWeekday: sbDayW,
      uniqueTimesWeekday: utW,
      slotsByDayWeekend: sbDayWe,
      uniqueTimesWeekend: utWe
    };
  }, [slots]);

  const renderGrid = (title, days, uniqueTimes, slotsByDay, headerColor) => (
    <div style={{ marginBottom: 40, backgroundColor: theme.background, borderRadius: 8, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
      <h3 style={{ padding: '15px 20px', margin: 0, backgroundColor: theme.light, borderBottom: `1px solid ${theme.border}`, color: theme.text }}>{title}</h3>
      <div style={{ padding: 20 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', borderRadius: 4, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: headerColor }}>
              <th style={{ padding: 12, color: 'white', fontWeight: 600, textAlign: 'left', borderRight: `1px solid ${theme.border}` }}>Time</th>
              {days.map(day => (
                <th key={day} style={{ padding: 12, color: 'white', fontWeight: 600, textAlign: 'center', borderRight: `1px solid rgba(255,255,255,0.2)` }}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueTimes.map((time, idx) => (
              <tr key={time} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : theme.light, borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: '12px', fontSize: '0.95em', fontWeight: 500, color: theme.text, borderRight: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}>{time}</td>
                {days.map(day => {
                  const daySlots = slotsByDay[day] || [];
                  const slotsAtTime = daySlots.filter(s => s.slotTime === time);
                  
                  if (slotsAtTime.length === 0) return <td key={day} style={{ borderRight: `1px solid ${theme.border}`, backgroundColor: '#e9ecef' }}></td>;

                  const cellAssignments = assignments.filter(a => slotsAtTime.some(s => s.id === a.slotId));

                  return (
                    <td key={day} style={{ padding: '8px', textAlign: 'center', borderRight: `1px solid ${theme.border}` }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {cellAssignments.length > 0 ? (
                          cellAssignments.map(assignment => (
                          <div key={assignment.slotId}
                            style={{ backgroundColor: assignment.isFallback ? theme.autoAssigned : theme.success, color: 'white', padding: '8px', borderRadius: 4, fontSize: '0.9em', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', cursor: 'default' }}
                            title={assignment.isFallback ? "System Assigned (Fallback)" : `Assigned Preference #${assignment.preferenceRank}`}
                          >
                            <div style={{ fontWeight: 'bold' }}>{assignment.coachName}</div>
                            <div style={{ fontSize: '0.85em', marginTop: 2 }}>
                              {assignment.coachGrade}th {assignment.coachGender === 'B' ? 'Boys' : assignment.coachGender === 'G' ? 'Girls' : assignment.coachGender} {assignment.coachTeam} - Round {assignment.round}
                            </div>
                          </div>))
                        ) : (
                          <div style={{ color: theme.textLight, fontSize: '0.85em', fontStyle: 'italic' }}>Unassigned</div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Calculating Draft Results...</div>;

  return (
    <div style={{ padding: '20px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: theme.text, margin: 0 }}>Final Selections</h2>
        <button 
          onClick={handleSave} 
          disabled={saving}
          style={{ ...buttonStyles.base, ...buttonStyles.success, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Final Assignments'}
        </button>
      </div>

      {renderGrid('Weekday Assignments (Mon-Fri)', weekdayDays, uniqueTimesWeekday, slotsByDayWeekday, theme.primary)}
      {renderGrid('Weekend Assignments (Sat-Sun)', weekendDays, uniqueTimesWeekend, slotsByDayWeekend, theme.weekend)}
    </div>
  );
};

export default FinalSelections;