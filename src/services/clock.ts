// The one place that knows what time it is, so tests can fix it. Use now() instead of new Date().
let fixed: Date | null = null;

export const now = (): Date => (fixed ? new Date(fixed.getTime()) : new Date());

// Pass a date to freeze the clock, or null to go back to the real time. Only tests call this.
export const setClock = (date: Date | string | null): void => {
  fixed = date === null ? null : new Date(date);
};
