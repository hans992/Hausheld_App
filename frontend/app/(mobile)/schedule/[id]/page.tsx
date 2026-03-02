"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  ListTodo,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SignaturePad } from "@/components/signature-pad";
import {
  getShift,
  getClients,
  checkOut,
  type Shift,
  type Client,
} from "@/lib/api";
import { getCurrentPosition } from "@/lib/geolocation";
import { cn } from "@/lib/utils";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
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

function statusPillClass(status: string) {
  switch (status) {
    case "Completed":
      return "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20";
    case "In_Progress":
      return "bg-primary/10 text-primary ring-1 ring-primary/25";
    case "Cancelled":
      return "bg-destructive/10 text-destructive ring-1 ring-destructive/25";
    case "Scheduled":
      return "bg-muted/30 text-muted-foreground ring-1 ring-border/60";
    default:
      return "bg-muted/25 text-muted-foreground ring-1 ring-border/50";
  }
}

/** Parse shift.tasks (e.g. "Cleaning, Cooking" or "Cleaning;Cooking") into list. */
function parseTasks(tasks: string): string[] {
  if (!tasks?.trim()) return [];
  return tasks
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function ShiftDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [shift, setShift] = useState<Shift | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const shiftData = await getShift(id);
      setShift(shiftData);
      try {
        const clientsList = await getClients();
        const c = clientsList.find((x) => x.id === shiftData.client_id) ?? null;
        setClient(c);
      } catch {
        setClient(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSignatureSubmit(signatureBase64: string) {
    if (!shift) return;
    setCheckingOut(true);
    try {
      const coords = await getCurrentPosition();
      await checkOut(shift.id, {
        check_out_location: coords,
        signature_base64: signatureBase64,
      });
      toast.success("Schicht erfolgreich beendet");
      setSignatureOpen(false);
      loadData();
      router.push("/schedule");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check-out fehlgeschlagen");
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-1 h-4 w-40" />
          </div>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
            <div className="flex flex-col gap-2 pt-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="space-y-4">
        <Link href="/schedule" className="inline-flex items-center gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Plan
        </Link>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Fehler
            </CardTitle>
            <CardDescription>{error ?? "Schicht nicht gefunden."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/schedule">Zum Plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tasksList = parseTasks(shift.tasks);
  const canFinish = shift.status === "In_Progress";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Zurück">
          <Link href="/schedule">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{shift.client_name ?? `Schicht #${shift.id}`}</h1>
          <p className="text-muted-foreground">{formatDate(shift.start_time)}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
            Zeiten & Status
          </CardTitle>
          <CardDescription className="flex flex-col gap-1 pt-1">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden />
              {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
            </span>
            <span
              className={cn(
                "mt-2 inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium",
                statusPillClass(shift.status)
              )}
            >
              {formatStatus(shift.status)}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      {client && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" aria-hidden />
              Client & Adresse
            </CardTitle>
            <CardDescription className="space-y-1 pt-1">
              <p className="font-medium text-foreground">{shift.client_name ?? client.name}</p>
              <p className="text-muted-foreground">{client.address}</p>
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      {!client && (shift.client_name ?? shift.client_id) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" aria-hidden />
              Client
            </CardTitle>
            <CardDescription className="pt-1">
              <p className="font-medium text-foreground">{shift.client_name ?? `Client #${shift.client_id}`}</p>
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {tasksList.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListTodo className="h-5 w-5 text-primary" aria-hidden />
              Aufgaben
            </CardTitle>
            <ul className="list-inside list-disc space-y-1 pt-1 text-base text-muted-foreground">
              {tasksList.map((task, i) => (
                <li key={i}>{task}</li>
              ))}
            </ul>
          </CardHeader>
        </Card>
      )}

      {canFinish && (
        <Card>
          <CardContent className="pt-6">
            <Button
              className="w-full"
              size="lg"
              onClick={() => setSignatureOpen(true)}
            >
              <CheckCircle className="h-5 w-5" aria-hidden />
              Schicht beenden (Unterschrift)
            </Button>
          </CardContent>
        </Card>
      )}

      <SignaturePad
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        onSubmit={handleSignatureSubmit}
        loading={checkingOut}
        title="Unterschrift zur Schichtbeendigung"
        submitLabel="Schicht beenden"
      />
    </div>
  );
}
