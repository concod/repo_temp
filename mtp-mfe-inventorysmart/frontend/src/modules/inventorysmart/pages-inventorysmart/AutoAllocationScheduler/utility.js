export function getWeekValue(date) {
  return Math.ceil(date / 7) - 1;
}

export function arrangeDatesByWeek(selectedDates, weeklySelectOne) {
  if (!selectedDates || !selectedDates.length) return [];

  if (!weeklySelectOne) return selectedDates;

  const arrangedDays = new Array(5).fill(undefined);

  //  check which week a date falls into and place the date in the correct week index
  selectedDates.forEach((day) => {
    const week = getWeekValue(day);
    arrangedDays[week] = day;
  });

  return arrangedDays;
}
