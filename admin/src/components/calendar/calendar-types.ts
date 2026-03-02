/**
 * Calendar event shape used by the shadcn-style calendar.
 * Maps from API Shift via shiftToCalendarEvent in the page.
 */
export type CalendarViewMode = "month" | "week" | "day";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string;
  extendedProps?: {
    status?: string;
    tasks?: string;
    worker_id?: number | null;
    client_id?: number;
    client_name?: string | null;
  };
  /** When true, event is unassigned and clickable for substitute flow */
  isUnassigned?: boolean;
}

export const SLOT_MIN = "06:00:00";
export const SLOT_MAX = "22:00:00";
