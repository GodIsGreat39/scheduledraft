// Dynamic timeslot configuration grouped by weekday/weekend

const generateSlots = () => {
  const slots = [];
  let weekdayOrder = 1;
  let weekendOrder = 1;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const isWeekday = (dayIndex) => dayIndex < 5;
  const isSaturday = (dayIndex) => dayIndex === 5;
  const isSunday = (dayIndex) => dayIndex === 6;

  days.forEach((day, dayIndex) => {
    let startHour, startMinute, endHour;
    let isWeek = isWeekday(dayIndex);

    if (isWeekday(dayIndex)) {
      // M-F: 4:30 PM onwards
      startHour = 16; // 4 PM
      startMinute = 30;
      endHour = 21; // 9 PM (5 hours: 4:30-5:30, 5:30-6:30, 6:30-7:30, 7:30-8:30, 8:30-9:30)
    } else if (isSaturday(dayIndex)) {
      // Sat: 8 AM - 5 PM (9 slots)
      startHour = 8;
      startMinute = 0;
      endHour = 17; // 5 PM
    } else if (isSunday(dayIndex)) {
      // Sun: 1 PM - 5 PM (4 slots)
      startHour = 13; // 1 PM
      startMinute = 0;
      endHour = 17; // 5 PM
    }

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour < endHour) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      let endHour = currentHour + 1;
      let endMinute = currentMinute;
      const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
      
      const slotGroup = isWeekday(dayIndex) ? 'weekday' : 'weekend';
      const order = isWeekday(dayIndex) ? weekdayOrder++ : weekendOrder++;

      slots.push({
        slotLabel: `${day} ${timeStr} - ${endTimeStr}`,
        slotTime: `${timeStr} - ${endTimeStr}`,
        slotStartTime: timeStr,
        slotEndTime: endTimeStr,
        slotDay: day,
        slotGroup,
        slotOrder: order,
      });

      currentMinute += 60;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute -= 60;
      }
    }
  });

  return slots;
};

export const timeslots = generateSlots();

