export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function previousLocalDateKey(date = new Date()): string {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return localDateKey(previous);
}
