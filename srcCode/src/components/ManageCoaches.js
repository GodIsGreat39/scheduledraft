import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { theme, buttonStyles } from './calendarUtils';

const ManageCoaches = () => {
  const [coaches, setCoaches] = useState([]);
  const [sortConfig, setSortConfig] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    loginId: '',
    password: '',
    name: '',
    teamName: '',
    teamGrade: '',
    teamGender: '',
    draftPriority: '',
    isAdmin: false,
    isCoach: true
  });

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    const { data, error } = await supabase.from('coaches').select('*').order('id');
    if (error) console.error('Error fetching coaches:', error);
    else setCoaches(data);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const coachData = {
      loginId: formData.loginId,
      password: formData.password,
      name: formData.name,
      teamName: formData.teamName,
      teamGrade: formData.teamGrade,
      teamGender: formData.teamGender,
      draftPriority: formData.draftPriority,
      isAdmin: formData.isAdmin,
      isCoach: formData.isCoach
    };

    const { error } = await supabase.from('coaches').insert([coachData]);
    if (error) console.error('Error adding coach:', error);

    fetchCoaches();
    setFormData({
      loginId: '',
      password: '',
      name: '',
      teamName: '',
      teamGrade: '',
      teamGender: '',
      draftPriority: '',
      isAdmin: false,
      isCoach: true
    });
    setIsAddModalOpen(false);
  };

  const updateCoach = async (id, field, value) => {
    // Optimistic update
    setCoaches(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

    const { error } = await supabase.from('coaches').update({ [field]: value }).eq('id', id);
    if (error) {
      console.error(`Error updating ${field}:`, error);
      fetchCoaches(); // Revert on error
    }
  };

  const compactDraftOrder = async () => {
    const coachList = coaches.filter(c => c.isCoach);
    
    // Sort by current priority (treating null/0 as end), then by ID
    coachList.sort((a, b) => {
      const pA = (a.draftPriority && a.draftPriority > 0) ? a.draftPriority : Number.MAX_SAFE_INTEGER;
      const pB = (b.draftPriority && b.draftPriority > 0) ? b.draftPriority : Number.MAX_SAFE_INTEGER;
      if (pA !== pB) return pA - pB;
      return a.id - b.id;
    });

    const updates = [];
    const priorityMap = new Map();

    coachList.forEach((coach, index) => {
      const newPriority = index + 1;
      if (Number(coach.draftPriority) !== newPriority) {
        updates.push({ id: coach.id, draftPriority: newPriority });
      }
      priorityMap.set(coach.id, newPriority);
    });

    if (updates.length > 0) {
      setCoaches(prev => prev.map(c => {
        if (priorityMap.has(c.id)) {
          return { ...c, draftPriority: priorityMap.get(c.id) };
        }
        return c;
      }));

      const { error } = await supabase.from('coaches').upsert(updates);
      if (error) {
        console.error('Error compacting draft order:', error);
        fetchCoaches();
      }
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((item) => item.key === key);
      let newConfig = prev.filter((item) => item.key !== key);
      
      let direction = 'ascending';
      if (existing && existing.direction === 'ascending') {
        direction = 'descending';
      }
      
      // Add to front to make it primary sort
      return [{ key, direction }, ...newConfig];
    });
  };

  const sortedCoaches = useMemo(() => {
    if (sortConfig.length === 0) return coaches;
    
    return [...coaches].sort((a, b) => {
      for (const { key, direction } of sortConfig) {
        if (key === 'draftPriority') {
          if (a.isCoach !== b.isCoach) {
            return a.isCoach ? -1 : 1;
          }
        }
        if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [coaches, sortConfig]);

  const getSortIndicator = (key) => {
    const config = sortConfig.find(c => c.key === key);
    if (!config) return ' ↕';
    return config.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  const filteredCoaches = useMemo(() => {
    if (!searchTerm) return sortedCoaches;
    const lowerTerm = searchTerm.toLowerCase();
    return sortedCoaches.filter(coach => 
      (coach.name && coach.name.toLowerCase().includes(lowerTerm)) ||
      (coach.loginId && coach.loginId.toLowerCase().includes(lowerTerm)) ||
      (coach.teamName && coach.teamName.toLowerCase().includes(lowerTerm))
    );
  }, [sortedCoaches, searchTerm]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this coach?')) {
      const { error } = await supabase.from('coaches').delete().eq('id', id);
      if (error) console.error('Error deleting coach:', error);
      else fetchCoaches();
    }
  };

  const gradeOptions = [
    { value: '4', label: '4th grade' },
    { value: '5', label: '5th grade' },
    { value: '6', label: '6th grade' },
    { value: '7', label: '7th grade' },
    { value: '8', label: '8th grade' },
  ];
  const genderOptions = [
    { value: 'B', label: 'Boy' },
    { value: 'G', label: 'Girl' },
  ];
  const teamNameOptions = ['A', 'B', '1', '2'];

  return (
    <div style={{ padding: '20px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: theme.text, margin: 0 }}>Manage Coaches</h2>
        <button 
          onClick={() => setIsAddModalOpen(true)} 
          style={{ ...buttonStyles.base, ...buttonStyles.success }}
        >
          Add Coach/User
        </button>
      </div>

      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: theme.background,
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: theme.primary }}>Add New Coach/User</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  name="loginId"
                  placeholder="Login ID"
                  value={formData.loginId}
                  onChange={handleInputChange}
                  style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}` }}
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}` }}
                  required
                />
              </div>
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}` }}
                onChange={handleInputChange}
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select
                  name="teamName"
                  value={formData.teamName}
                  style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}` }}
                  onChange={handleInputChange}
                >
                  <option value="">Select Team</option>
                  {teamNameOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <select
                  name="teamGrade"
                  value={formData.teamGrade}
                  style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}` }}
                  onChange={handleInputChange}
                >
                  <option value="">Select Grade</option>
                  {gradeOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select
                  name="teamGender"
                  value={formData.teamGender}
                  style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}` }}
                  onChange={handleInputChange}
                >
                  <option value="">Select Gender</option>
                  {genderOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                <input
                  type="number"
                  name="draftPriority"
                  placeholder="Draft Priority"
                  value={formData.draftPriority}
                  style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}` }}
                  onChange={handleInputChange}
                />
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    name="isAdmin"
                    checked={formData.isAdmin}
                    onChange={handleInputChange}
                  />
                  Is Admin
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    name="isCoach"
                    checked={formData.isCoach}
                    onChange={handleInputChange}
                  />
                  Is Coach
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ ...buttonStyles.base, ...buttonStyles.success, flex: 1 }}>
                  Add Coach
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  style={{ ...buttonStyles.base, ...buttonStyles.secondary }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Search coaches..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, width: '300px' }}
        />
        <button 
          onClick={compactDraftOrder} 
          style={{ ...buttonStyles.base, ...buttonStyles.primary }}
          title="Remove gaps and ensure unique sequential draft order for all coaches"
        >
          Fix / Compact Draft Order
        </button>
      </div>

      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: theme.background, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderColor: theme.border }}>
        <thead>
          <tr style={{ backgroundColor: theme.light, textAlign: 'left' }}>
            <th onClick={() => handleSort('loginId')} style={{ cursor: 'pointer' }}>Login ID{getSortIndicator('loginId')}</th>
            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Name{getSortIndicator('name')}</th>
            <th onClick={() => handleSort('teamName')} style={{ cursor: 'pointer' }}>Team{getSortIndicator('teamName')}</th>
            <th onClick={() => handleSort('teamGrade')} style={{ cursor: 'pointer' }}>Grade{getSortIndicator('teamGrade')}</th>
            <th onClick={() => handleSort('teamGender')} style={{ cursor: 'pointer' }}>Gender{getSortIndicator('teamGender')}</th>
            <th onClick={() => handleSort('draftPriority')} style={{ cursor: 'pointer' }}>Draft Order{getSortIndicator('draftPriority')}</th>
            <th>Roles</th>
            <th>Submitted Preferences (Weekday/Weekend)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCoaches.map((coach) => (
            <tr key={coach.id}>
              <td>
                <input 
                  type="text" 
                  defaultValue={coach.loginId} 
                  onBlur={(e) => updateCoach(coach.id, 'loginId', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                />
              </td>
              <td>
                <input 
                  type="text" 
                  defaultValue={coach.name} 
                  onBlur={(e) => updateCoach(coach.id, 'name', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                />
              </td>
              <td>
                <select
                  value={coach.teamName || ''}
                  onChange={(e) => updateCoach(coach.id, 'teamName', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                >
                  <option value="">Select Team</option>
                  {teamNameOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </td>
              <td>
                <select
                  value={coach.teamGrade || ''}
                  onChange={(e) => updateCoach(coach.id, 'teamGrade', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                >
                  <option value="">Select Grade</option>
                  {gradeOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </td>
              <td>
                <select
                  value={coach.teamGender || ''}
                  onChange={(e) => updateCoach(coach.id, 'teamGender', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                >
                  <option value="">Select Gender</option>
                  {genderOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </td>
              <td>
                <input 
                  type="number" 
                  key={coach.draftPriority}
                  defaultValue={coach.draftPriority} 
                  onBlur={async (e) => {
                    const newPriority = parseInt(e.target.value, 10);
                    if (isNaN(newPriority) || newPriority === coach.draftPriority) return;

                    if (!coach.isCoach) {
                      updateCoach(coach.id, 'draftPriority', newPriority);
                      return;
                    }

                    // Sort by current priority to determine order
                    const coachesList = coaches.filter(c => c.isCoach);
                    const sorted = [...coachesList].sort((a, b) => (a.draftPriority || 0) - (b.draftPriority || 0));
                    const currentIndex = sorted.findIndex(c => c.id === coach.id);
                    if (currentIndex === -1) return;

                    // Remove and re-insert
                    const [item] = sorted.splice(currentIndex, 1);
                    // Adjust target index (1-based priority to 0-based index)
                    let targetIndex = newPriority - 1;
                    if (targetIndex < 0) targetIndex = 0;
                    if (targetIndex > sorted.length) targetIndex = sorted.length;
                    
                    sorted.splice(targetIndex, 0, item);

                    // Calculate updates
                    const updates = sorted.map((c, idx) => ({
                      id: c.id,
                      draftPriority: idx + 1
                    })).filter(u => {
                      const original = coaches.find(c => c.id === u.id);
                      return original.draftPriority !== u.draftPriority;
                    });

                    if (updates.length > 0) {
                      // Optimistic update
                      setCoaches(prev => prev.map(c => {
                        const update = updates.find(u => u.id === c.id);
                        return update ? { ...c, draftPriority: update.draftPriority } : c;
                      }));
                      
                      const { error } = await supabase.from('coaches').upsert(updates);
                      if (error) {
                        console.error('Error updating priorities:', error);
                        fetchCoaches();
                      }
                    }
                  }}
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                />
              </td>
              <td>
                <label style={{ marginRight: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={coach.isAdmin || false} 
                    onChange={(e) => updateCoach(coach.id, 'isAdmin', e.target.checked)}
                  /> Admin
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={coach.isCoach || false} 
                    onChange={(e) => updateCoach(coach.id, 'isCoach', e.target.checked)}
                  /> Coach
                </label>
              </td>
              <td style={{ textAlign: 'center' }}>
                {coach.weekdayPreferencesSaved ? 'Y' : 'N'} / {coach.weekendPreferenceSaved ? 'Y' : 'N'}
              </td>
              <td>
                <button onClick={() => handleDelete(coach.id)} style={{ ...buttonStyles.base, ...buttonStyles.danger, padding: '4px 8px', fontSize: '0.8em' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageCoaches;