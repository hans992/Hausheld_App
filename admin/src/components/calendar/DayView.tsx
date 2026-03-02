import type { CalendarEvent } from "./calendar-types";
import { eventsForDay, eventToMinutes, timeToFraction, formatTime } from "./calendar-utils";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

interface DayViewProps {
  viewDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

export function DayView({ viewDate, events, onEventClick, className }: DayViewProps) {
  const dayStart = new Date(viewDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEvents = eventsForDay(events, viewDate);

  return (
    <div className={cn("overflow-auto rounded-lg border border-border/70", className)}>
      <div className="flex min-w-[280px]">
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
        <div className="relative flex-1">
          {HOURS.map((h) => (
            <div key={h} className="h-12 border-b border-border/50" aria-hidden />
          ))}
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
                    className="pointer-events-auto absolute left-2 right-2 overflow-hidden rounded-md border px-2 py-1 text-sm cursor-pointer"
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      minHeight: 28,
                      borderColor: "var(--border)",
                      backgroundColor: ev.isUnassigned ? "hsl(var(--destructive) / 0.25)" : "hsl(var(--primary) / 0.2)",
                    }}
                    role="button"
                    tabIndex={0}
                    onClick={() => onEventClick?.(ev)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onEventClick?.(ev);
                      }
                    }}
                  >
                    <span className="font-medium truncate block">{ev.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatTime(ev.start)} – {formatTime(ev.end)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
