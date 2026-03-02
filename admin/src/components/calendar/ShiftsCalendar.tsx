import { useState, useMemo } from "react";
import { CalendarHeader } from "./CalendarHeader";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { MonthView } from "./MonthView";
import type { CalendarEvent, CalendarViewMode } from "./calendar-types";
import {
  getWeekStart,
  addDays,
  addWeeks,
  addMonths,
  formatMonthYear,
  formatDayLabel,
} from "./calendar-utils";

export interface ShiftsCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

export function ShiftsCalendar({ events, onEventClick, className }: ShiftsCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [mode, setMode] = useState<CalendarViewMode>("week");

  const title = useMemo(() => {
    switch (mode) {
      case "month":
        return formatMonthYear(viewDate);
      case "week": {
        const start = getWeekStart(viewDate);
        const end = addDays(start, 6);
        return `${start.getDate()} ${start.toLocaleDateString(undefined, { month: "short" })} – ${end.getDate()} ${end.toLocaleDateString(undefined, { month: "short" })} ${viewDate.getFullYear()}`;
      }
      case "day":
        return formatDayLabel(viewDate);
      default:
        return formatMonthYear(viewDate);
    }
  }, [mode, viewDate]);

  const goPrev = () => {
    if (mode === "day") setViewDate((d) => addDays(d, -1));
    else if (mode === "week") setViewDate((d) => addWeeks(d, -1));
    else setViewDate((d) => addMonths(d, -1));
  };

  const goNext = () => {
    if (mode === "day") setViewDate((d) => addDays(d, 1));
    else if (mode === "week") setViewDate((d) => addWeeks(d, 1));
    else setViewDate((d) => addMonths(d, 1));
  };

  const goToday = () => setViewDate(new Date());

  return (
    <div className={className}>
      <CalendarHeader
        viewDate={viewDate}
        mode={mode}
        title={title}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onModeChange={setMode}
      />
      <div className="mt-4">
        {mode === "month" && (
          <MonthView viewDate={viewDate} events={events} onEventClick={onEventClick} />
        )}
        {mode === "week" && (
          <WeekView viewDate={viewDate} events={events} onEventClick={onEventClick} />
        )}
        {mode === "day" && (
          <DayView viewDate={viewDate} events={events} onEventClick={onEventClick} />
        )}
      </div>
    </div>
  );
}
