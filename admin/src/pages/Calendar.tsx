import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import {
  getShifts,
  getSuggestSubstitutes,
  updateShift,
  type Shift,
  type SubstituteSuggestion,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

function shiftToEvent(s: Shift) {
  const clientLabel = s.client_name ?? `Client ${s.client_id}`;
  return {
    id: String(s.id),
    title: s.worker_id
      ? `Shift #${s.id} (${clientLabel})`
      : `Unassigned #${s.id} (${clientLabel})`,
    start: s.start_time,
    end: s.end_time,
    extendedProps: { status: s.status, tasks: s.tasks },
    ...(s.status === "Unassigned" ? { classNames: ["fc-event-unassigned"] } : {}),
  };
}

export function Calendar() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [substitutes, setSubstitutes] = useState<SubstituteSuggestion[]>([]);
  const [substitutesLoading, setSubstitutesLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getShifts()
      .then(setShifts)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load shifts"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedShiftId == null) {
      setSubstitutes([]);
      return;
    }
    setSubstitutesLoading(true);
    getSuggestSubstitutes(selectedShiftId)
      .then(setSubstitutes)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load substitutes");
        setSubstitutes([]);
      })
      .finally(() => setSubstitutesLoading(false));
  }, [selectedShiftId]);

  function handleEventClick(info: EventClickArg) {
    const status = (info.event.extendedProps as { status?: string }).status;
    if (status !== "Unassigned") return;
    const id = Number(info.event.id);
    if (!Number.isInteger(id)) return;
    setSelectedShiftId(id);
  }

  async function handleAssign(workerId: number) {
    if (selectedShiftId == null) return;
    setAssigningId(workerId);
    try {
      await updateShift(selectedShiftId, { worker_id: workerId });
      toast.success("Worker assigned to shift");
      setSelectedShiftId(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setAssigningId(null);
    }
  }

  const events = shifts.map(shiftToEvent);
  const selectedShift = selectedShiftId != null ? shifts.find((s) => s.id === selectedShiftId) : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            Click an <strong>Unassigned</strong> shift to see suggested substitutes and assign a worker.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[400px] w-full rounded-lg" aria-hidden />
            <p className="mt-3 text-center text-sm text-muted-foreground">Loading calendar…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">Ensure you are logged in as Admin and the API is running.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">
          Click an <strong>Unassigned</strong> shift to see suggested substitutes and assign a worker.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
            events={events}
            editable={false}
            height="auto"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            eventClick={handleEventClick}
          />
          {events.length === 0 && (
            <EmptyState
              icon={<UserPlus className="h-6 w-6" />}
              title="No shifts this month"
              description="Shifts are created via the backend or demo seed. Add workers and clients first, then create shifts to see them here."
              action={
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button variant="secondary" size="sm" asChild>
                    <Link to="/admin/workers">Workers</Link>
                  </Button>
                  <Button variant="secondary" size="sm" asChild>
                    <Link to="/admin/clients">Clients</Link>
                  </Button>
                </div>
              }
              className="mt-6"
            />
          )}
        </CardContent>
      </Card>

      {selectedShiftId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="substitutes-title">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 id="substitutes-title" className="text-lg font-semibold">
                Suggested substitutes — Shift #{selectedShiftId}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedShiftId(null)} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {selectedShift && (
              <p className="mt-1 text-sm text-muted-foreground">
                Client {selectedShift.client_id} · {selectedShift.tasks}
              </p>
            )}
            <div className="mt-4">
              {substitutesLoading ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Loading suggestions…
                </div>
              ) : substitutes.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No suggested substitutes (e.g. no client location or no available workers).</p>
              ) : (
                <ul className="space-y-3">
                  {substitutes.map((s) => (
                    <li key={s.worker.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                      <div>
                        <p className="font-medium">{s.worker.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ~{Math.round(s.distance_meters)} m away · {s.remaining_capacity_hours.toFixed(1)} h free this week
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAssign(s.worker.id)}
                        disabled={assigningId === s.worker.id}
                      >
                        {assigningId === s.worker.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <UserPlus className="h-4 w-4" aria-hidden />
                        )}
                        Assign
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
