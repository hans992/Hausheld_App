import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle, AlertTriangle, X, ListOrdered } from "lucide-react";
import { getClients, getClientBudgetStatus, type Client, type BudgetStatusResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function BudgetDetailModal({
  client,
  status,
  month,
  onClose,
}: {
  client: Client;
  status: BudgetStatusResponse | undefined;
  month: string;
  onClose: () => void;
}) {
  const deductions = status?.deductions ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="budget-detail-title">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 id="budget-detail-title" className="text-lg font-semibold">
            Budget deductions — {client.name}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Month: {month} · Monthly budget: {client.monthly_budget} € · Remaining: {status?.remaining_budget ?? "—"} €
        </p>
        <div className="mt-4">
          {deductions.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No deductions for this month.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift ID</TableHead>
                  <TableHead>Duration (h)</TableHead>
                  <TableHead>Cost (€)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.map((d) => (
                  <TableRow key={d.shift_id}>
                    <TableCell>{d.date}</TableCell>
                    <TableCell className="font-mono">{d.shift_id}</TableCell>
                    <TableCell>{d.duration_hours}</TableCell>
                    <TableCell>{d.cost}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {status && deductions.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Total deducted: {status.total_deducted} €
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [budgetByClient, setBudgetByClient] = useState<Record<number, BudgetStatusResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const month = currentMonth();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getClients()
      .then((list) => {
        setClients(list);
        return Promise.all(list.map((c) => getClientBudgetStatus(c.id, month)));
      })
      .then((statuses) => {
        const map: Record<number, BudgetStatusResponse> = {};
        statuses.forEach((s) => (map[s.client_id] = s));
        setBudgetByClient(map);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load clients"))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">Loading clients…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-muted-foreground">
          Monthly budget and remaining Entlastungsbetrag. Red badge when below 15%. Click a client to see full deduction list.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All clients (month: {month})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Monthly budget</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const status = budgetByClient[c.id];
                const budgetAlert = status?.budget_alert ?? false;
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setDetailClient(c)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{c.address}</TableCell>
                    <TableCell>{c.monthly_budget} €</TableCell>
                    <TableCell>{status ? `${status.remaining_budget} €` : "—"}</TableCell>
                    <TableCell>
                      {budgetAlert ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-sm font-medium text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                          Below 15%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">OK</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailClient(c);
                        }}
                        aria-label={`View budget details for ${c.name}`}
                      >
                        <ListOrdered className="h-4 w-4" aria-hidden />
                        Deductions
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {detailClient && (
        <BudgetDetailModal
          client={detailClient}
          status={budgetByClient[detailClient.id]}
          month={month}
          onClose={() => setDetailClient(null)}
        />
      )}
    </div>
  );
}
