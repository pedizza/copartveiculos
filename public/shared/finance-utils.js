const mondayOf = day => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};

export const summarizeFinanceEntries = (entries, staff, today) => {
  const summary = new Map(staff.map(person => [person.id, { ...person, daily: 0, weekly: 0, monthly: 0 }]));
  const weekStart = mondayOf(today);
  for (const entry of entries) {
    const employee = summary.get(entry.employee_id) || { id: entry.employee_id, full_name: entry.employee_name || 'Funcionário', daily: 0, weekly: 0, monthly: 0 };
    const amount = Number(entry.amount || 0);
    const date = String(entry.entry_date).slice(0, 10);
    if (date <= today) employee.monthly += amount;
    if (date === today) employee.daily += amount;
    if (date >= weekStart && date <= today) employee.weekly += amount;
    summary.set(entry.employee_id, employee);
  }
  return [...summary.values()];
};
