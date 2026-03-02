import type { CalendarEvent } from "./calendar-types";
import { getMonthDates, eventsForDay, formatTime, isToday } from "./calendar-utils";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  viewDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
  className?: string;
}

export function MonthView({ viewDate, events, onEventClick, onDayClick, className }: MonthViewProps) {
  const cells = getMonthDates(viewDate);
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className={cn("overflow-auto rounded-lg border border-border/70", className)}>
      <div className="min-w-[400px]">
        <div className="grid grid-cols-7 border-b border-border/70 bg-muted/30">
          {weekDays.map((d) => (
            <div key={d} className="border-r border-border/70 py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map(({ date, isCurrentMonth }) => {
            const dayEvents = eventsForDay(events, date);
            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "min-h-[100px] border-b border-r border-border/70 p-1 last:border-r-0",
                  !isCurrentMonth && "bg-muted/20",
                  isToday(date) && "bg-primary/5"
                )}
                role="gridcell"
                aria-label={date.toLocaleDateString()}
              >
                <button
                  type="button"
                  className={cn(
                    "mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isToday(date) ? "bg-primary text-primary-foreground" : "hover:bg-muted/50",
                    !isCurrentMonth && "text-muted-foreground"
                  )}
                  onClick={() => onDayClick?.(date)}
                >
                  {date.getDate()}
                </button>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      className={cn(
                        "w-full truncate rounded px-1.5 py-0.5 text-left text-xs border cursor-pointer",
                        ev.isUnassigned
                          ? "border-destructive/50 bg-destructive/15 text-destructive-foreground hover:bg-destructive/25"
                          : "border-border/70 bg-primary/15 hover:bg-primary/25"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(ev);
                      }}
                    >
                      {formatTime(ev.start)} {ev.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-muted-foreground px-1">+{dayEvents.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
