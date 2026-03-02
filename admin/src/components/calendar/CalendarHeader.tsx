import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarViewMode } from "./calendar-types";

interface CalendarHeaderProps {
  viewDate?: Date;
  mode: CalendarViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onModeChange: (mode: CalendarViewMode) => void;
  title: string;
  className?: string;
}

export function CalendarHeader({
  mode,
  onPrev,
  onNext,
  onToday,
  onModeChange,
  title,
  className,
}: CalendarHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} aria-label="Previous">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} aria-label="Next">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={onToday}>
          Today
        </Button>
        <span className="ml-2 text-lg font-semibold tabular-nums" aria-live="polite">
          {title}
        </span>
      </div>
      <div className="flex rounded-lg border border-border/70 bg-muted/20 p-0.5">
        <button
          type="button"
          onClick={() => onModeChange("month")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={mode === "month"}
        >
          <Calendar className="h-4 w-4" />
          Month
        </button>
        <button
          type="button"
          onClick={() => onModeChange("week")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={mode === "week"}
        >
          <CalendarRange className="h-4 w-4" />
          Week
        </button>
        <button
          type="button"
          onClick={() => onModeChange("day")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={mode === "day"}
        >
          <CalendarDays className="h-4 w-4" />
          Day
        </button>
      </div>
    </div>
  );
}
