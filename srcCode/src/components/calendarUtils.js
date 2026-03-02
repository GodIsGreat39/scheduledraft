import { BRANDING } from '../config';

// Theme colors
export const theme = {
  primary: BRANDING.colors.primary,
  primaryHover: BRANDING.colors.primaryHover,
  weekend: '#6f42c1',
  autoAssigned: '#66b2ff',
  secondary: BRANDING.colors.secondary,
  success: BRANDING.colors.success,
  danger: BRANDING.colors.danger,
  light: BRANDING.colors.light,
  border: '#dee2e6', // Standard border color
  text: '#212529',   // Standard text color
  textLight: '#6c757d',
  background: BRANDING.colors.background,
};

export const buttonStyles = {
  base: {
    padding: '8px 16px',
    fontSize: '0.95em',
    fontWeight: 600,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
  },
  primary: {
    color: 'white',
    backgroundColor: theme.primary,
  },
  success: {
    color: 'white',
    backgroundColor: theme.success,
  },
  danger: {
    color: 'white',
    backgroundColor: theme.danger,
  },
  outlineDanger: {
    backgroundColor: 'transparent',
    border: `1px solid ${theme.danger}`,
    color: theme.danger,
  }
};

// Consolidate preferences within a group
export const compactPrefsForGroup = (prefs) => {
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
export const getNextPriority = (prefs) => {
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
export const reorderGroupOnSet = (prefs, changedOrder, newPriority) => {
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
export const reorderGroupOnClear = (prefs, changedOrder, oldPriority) => {
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

// when Sortable informs us of order change, update preferences
export const handleOrderChange = (prefs, setPrefs, oldIndex, newIndex) => {
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

// Get ordered list for a group
export const getOrderedList = (prefs) => {
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
export const hasGaps = (prefs) => {
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