export function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function parseDay(value) {
  if (!value) return startOfDay();
  return startOfDay(new Date(`${value}T00:00:00`));
}
