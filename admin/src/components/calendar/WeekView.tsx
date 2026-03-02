import type { CalendarEvent } from "./calendar-types";
import {
  getWeekStart,
  getWeekDates,
  eventsForWeekDay,
  eventToMinutes,
  timeToFraction,
  formatTime,
  isToday,
} from "./calendar-utils";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6–22

interface WeekViewProps {
  viewDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

export function WeekView({ viewDate, events, onEventClick, className }: WeekViewProps) {
  const weekStart = getWeekStart(viewDate);
  const days = getWeekDates(weekStart);

  return (
    <div className={cn("overflow-auto rounded-lg border border-border/70", className)}>
      <div className="min-w-[700px]">
        {/* Header row: empty corner + day labels */}
        <div className="flex border-b border-border/70 bg-muted/30 sticky top-0 z-10">
          <div className="w-14 shrink-0 border-r border-border/70 py-2 text-center text-xs font-medium text-muted-foreground" />
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={cn(
                "flex-1 min-w-[100px] border-r border-border/70 py-2 text-center text-xs font-medium last:border-r-0",
                (d.getDay() === 0 || d.getDay() === 6) && "text-muted-foreground",
                isToday(d) && "bg-primary/10 text-primary"
              )}
            >
              <div>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
              <div className="text-base font-semibold">{d.getDate()}</div>
            </div>
          ))}
        </div>
        {/* Time grid: 1 row per hour */}
        <div className="flex">
          <div className="w-14 shrink-0 border-r border-border/70">
            {HOURS.map((h) => (
              <div
                key={h}
                className="h-12 border-b border-border/50 py-0.5 pr-1 text-right text-xs text-muted-foreground"
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>
          <div className="flex flex-1">
            {days.map((day) => {
              const dayStart = new Date(day);
              dayStart.setHours(0, 0, 0, 0);
              const dayEvents = eventsForWeekDay(events, day);
              return (
                <div
                  key={day.toISOString()}
                  className="relative flex-1 min-w-[100px] border-r border-border/70 last:border-r-0"
                >
                  {HOURS.map((h) => (
                    <div key={h} className="h-12 border-b border-border/50" aria-hidden />
                  ))}
                  {/* Event blocks */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="relative w-full" style={{ height: HOURS.length * 48 }}>
                      {dayEvents.map((ev) => {
                        const startM = eventToMinutes(ev.start);
                        const endM = eventToMinutes(ev.end);
                        const top = timeToFraction(startM) * 100;
                        const height = Math.max(4, (timeToFraction(endM) - timeToFraction(startM)) * 100);
                        return (
                          <div
                            key={ev.id}
                            className="pointer-events-auto absolute left-0.5 right-0.5 overflow-hidden rounded-md border px-1.5 py-0.5 text-xs cursor-pointer"
                            style={{
                              top: `${top}%`,
                              height: `${height}%`,
                              minHeight: 20,
                              borderColor: "var(--border)",
                              backgroundColor: ev.isUnassigned ? "hsl(var(--destructive) / 0.25)" : "hsl(var(--primary) / 0.2)",
                            }}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick?.(ev);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onEventClick?.(ev);
                              }
                            }}
                          >
                            <span className="font-medium truncate block">{ev.title}</span>
                            <span className="text-muted-foreground">
                              {formatTime(ev.start)} – {formatTime(ev.end)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
