"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { checkIn, getShiftsForToday, type Shift } from "@/lib/api";
import { getCurrentPosition } from "@/lib/geolocation";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    Scheduled: "Geplant",
    In_Progress: "Läuft",
    Completed: "Erledigt",
    Cancelled: "Abgesagt",
    Unassigned: "Nicht zugewiesen",
  };
  return map[status] ?? status;
}

export default function SchedulePage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  const loadShifts = useCallback(() => {
    getShiftsForToday()
      .then(setShifts)
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler beim Laden"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  async function handleCheckIn(shiftId: number) {
    setCheckingInId(shiftId);
    try {
      const coords = await getCurrentPosition();
      await checkIn(shiftId, { check_in_location: coords });
      toast.success("Check-in erfolgreich");
      loadShifts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check-in fehlgeschlagen");
    } finally {
      setCheckingInId(null);
    }
  }

  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-muted-foreground">Lade deinen Plan …</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Mein Plan</h1>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Fehler
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Bitte melde dich an (Profile) und stelle sicher, dass der Server läuft.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <CalendarDays className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mein Plan</h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
      </div>

      {shifts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Keine Einsätze heute</CardTitle>
            <CardDescription>
              Du hast für heute keine Schichten. Prüfe morgen erneut oder kontaktiere die Verwaltung.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-4">
          {shifts
            .sort(
              (a, b) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            )
            .map((shift) => (
              <li key={shift.id}>
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <Link href={`/schedule/${shift.id}`} className="block">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-lg">
                          Client #{shift.client_id}
                        </CardTitle>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                              shift.status === "Completed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : shift.status === "In_Progress"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {formatStatus(shift.status)}
                          </span>
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </span>
                      </div>
                      <CardDescription className="flex flex-col gap-1 pt-1">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4" aria-hidden />
                          {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                        </span>
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" aria-hidden />
                          {shift.tasks}
                        </span>
                      </CardDescription>
                    </CardHeader>
                  </Link>
                  <CardContent className="flex gap-3 pt-0">
                    {shift.status === "Scheduled" && (
                      <Button
                        className="flex-1"
                        size="lg"
                        disabled={checkingInId === shift.id}
                        onClick={(e) => {
                          e.preventDefault();
                          handleCheckIn(shift.id);
                        }}
                      >
                        {checkingInId === shift.id ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                            Standort …
                          </>
                        ) : (
                          "Check-in"
                        )}
                      </Button>
                    )}
                    {shift.status === "In_Progress" && (
                      <Link href={`/schedule/${shift.id}`} className="flex-1">
                        <Button className="w-full" size="lg" variant="secondary">
                          Schicht beenden
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
