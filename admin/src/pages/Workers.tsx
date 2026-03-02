import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, UserX } from "lucide-react";
import { toast } from "sonner";
import { getWorkers, setSickLeave, type Worker } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

function SickLeaveDialog({
  worker,
  onClose,
  onSuccess,
}: {
  worker: Worker;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await setSickLeave(worker.id, { start_date: start, end_date: end });
      toast.success(`Sick leave set. ${res.shifts_marked_unassigned} shift(s) unassigned.`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sick leave failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold">Sick Leave: {worker.name}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Start date</label>
            <Input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground">End date</label>
            <Input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
              Set sick leave
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sickLeaveWorker, setSickLeaveWorker] = useState<Worker | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getWorkers()
      .then(setWorkers)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load workers"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Workers</h1>
          <p className="text-muted-foreground">Manage workers and set sick leave. Use Calendar to find substitutes.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All workers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Workers</h1>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workers</h1>
        <p className="text-muted-foreground">Manage workers and set sick leave. Use Calendar to find substitutes.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All workers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState
                      icon={<UserX className="h-6 w-6" />}
                      title="No workers yet"
                      description="Workers are added via the backend or demo seed. Use Calendar to assign shifts once you have workers."
                      action={
                        <Link
                          to="/admin/calendar"
                          className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          Open Calendar
                        </Link>
                      }
                      className="rounded-none border-0"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                workers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>{w.email}</TableCell>
                  <TableCell>{w.role}</TableCell>
                  <TableCell>{w.is_available ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSickLeaveWorker(w)}>
                      <UserX className="h-4 w-4" />
                      Sick leave
                    </Button>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {sickLeaveWorker && (
        <SickLeaveDialog
          worker={sickLeaveWorker}
          onClose={() => setSickLeaveWorker(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
