import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadBillingCsv } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function Billing() {
  const [month, setMonth] = useState(currentMonth());
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadBillingCsv(month);
      toast.success(`SGB XI CSV downloaded: billing_${month}.csv. Contains data for ${month}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Export completed shifts for SGB XI billing. Budget alerts are on the Clients page.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>SGB XI CSV Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a CSV for the selected month: Client Name, Insurance Number, Date, Duration (hours), Signature Key.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label htmlFor="billing-month" className="block text-sm font-medium text-muted-foreground mb-1">
                Month
              </label>
              <Input
                id="billing-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-[200px]"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleDownload} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-4 w-4" aria-hidden />
                )}
                Download SGB XI CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
