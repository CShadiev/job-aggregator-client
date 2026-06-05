const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const dayMs = 24 * 60 * 60 * 1000;

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateFormatter.format(date);
}

export function isPostedWithinDays(value: string, days: number): boolean {
  if (days <= 0) {
    return true;
  }

  const postedAt = new Date(value);
  if (Number.isNaN(postedAt.getTime())) {
    return false;
  }

  return postedAt.getTime() >= Date.now() - days * dayMs;
}
